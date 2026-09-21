import { AST_NODE_TYPES, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { exceptionAllows } from './architecture-exceptions.ts';
import { WEB_OWNERS, webLayer } from './boundary-policy.ts';

const effects = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect']);
const reactSources = new Set(['react', 'react/index.js', 'react/index']);
const hostGlobals = new Set(['window', 'document', 'fetch', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'history', 'location', 'navigator', 'MutationObserver', 'ResizeObserver', 'IntersectionObserver']);
const mutators = new Set(['appendChild', 'removeChild', 'replaceChild', 'insertBefore', 'replaceChildren', 'append', 'prepend', 'remove', 'replaceWith', 'insertAdjacentElement', 'insertAdjacentHTML', 'write', 'writeln']);

const hostOrFramework = (file: string): boolean => {
	const layer = webLayer(file);
	return layer?.kind === 'host' || layer?.kind === 'framework';
};

const report = (context: TSESLint.RuleContext<'forbidden', []>, node: TSESTree.Node, symbol: string, reason: string): void => {
	if (exceptionAllows(context.filename, symbol, 'agora/renderer-footgun')) return;
	context.report({ node, messageId: 'forbidden', data: { reason } });
};

function importedName(spec: TSESTree.ImportSpecifier): string | undefined {
	if (spec.imported.type === AST_NODE_TYPES.Identifier) return spec.imported.name;
	return undefined;
}

function isReactSource(value: string): boolean {
	return reactSources.has(value) || value.startsWith('react/');
}

function importDeclarationOf(identifier: TSESTree.Identifier, context: TSESLint.RuleContext<'forbidden', []>): TSESTree.ImportDeclaration | undefined {
	let current: ReturnType<TSESLint.SourceCode['getScope']> | null = context.sourceCode.getScope(identifier);
	while (current) {
		const variable = current.set.get(identifier.name);
		if (variable) {
			const def = variable.defs[0];
			if (def === undefined || (def.type as string) !== 'ImportBinding') return undefined;
			const parent = def.parent as TSESTree.Node | null | undefined;
			return parent?.type === AST_NODE_TYPES.ImportDeclaration ? parent : undefined;
		}
		current = current.upper;
	}
	return undefined;
}

function importSpecifierNamed(identifier: TSESTree.Identifier, context: TSESLint.RuleContext<'forbidden', []>): TSESTree.ImportSpecifier | undefined {
	let current: ReturnType<TSESLint.SourceCode['getScope']> | null = context.sourceCode.getScope(identifier);
	while (current) {
		const variable = current.set.get(identifier.name);
		if (variable) {
			const def = variable.defs[0];
			if (def === undefined || (def.type as string) !== 'ImportBinding') return undefined;
			return def.node.type === AST_NODE_TYPES.ImportSpecifier ? def.node : undefined;
		}
		current = current.upper;
	}
	return undefined;
}

function importNamespaceOrDefault(identifier: TSESTree.Identifier, context: TSESLint.RuleContext<'forbidden', []>): boolean {
	let current: ReturnType<TSESLint.SourceCode['getScope']> | null = context.sourceCode.getScope(identifier);
	while (current) {
		const variable = current.set.get(identifier.name);
		if (variable) {
			const def = variable.defs[0];
			if (def === undefined || (def.type as string) !== 'ImportBinding') return false;
			return def.node.type === AST_NODE_TYPES.ImportNamespaceSpecifier || def.node.type === AST_NODE_TYPES.ImportDefaultSpecifier;
		}
		current = current.upper;
	}
	return false;
}

/** Resolve a callee to a React effect hook original name, or undefined for locals/other bindings. */
function reactEffectFromCallee(context: TSESLint.RuleContext<'forbidden', []>, callee: TSESTree.Expression): string | undefined {
	if (callee.type === AST_NODE_TYPES.Identifier) {
		const decl = importDeclarationOf(callee, context);
		const spec = importSpecifierNamed(callee, context);
		if (!decl || !spec || typeof decl.source.value !== 'string' || !isReactSource(decl.source.value)) return undefined;
		const original = importedName(spec);
		return original && effects.has(original) ? original : undefined;
	}
	if (
		callee.type === AST_NODE_TYPES.MemberExpression
		&& !callee.computed
		&& callee.object.type === AST_NODE_TYPES.Identifier
		&& callee.property.type === AST_NODE_TYPES.Identifier
		&& effects.has(callee.property.name)
	) {
		const decl = importDeclarationOf(callee.object, context);
		if (!decl || typeof decl.source.value !== 'string' || !isReactSource(decl.source.value)) return undefined;
		if (!importNamespaceOrDefault(callee.object, context)) return undefined;
		return callee.property.name;
	}
	return undefined;
}

export const rendererFootgunRule: TSESLint.RuleModule<'forbidden'> = {
	meta: { type: 'problem', schema: [], messages: { forbidden: '{{reason}}' } },
	defaultOptions: [],
	create(context) {
		const file = context.filename;
		const layer = webLayer(file);
		if (!layer && !file.includes('/apps/web/')) return {};
		return {
			CallExpression(node) {
				if (webLayer(file)?.kind === 'framework') return;
				const hook = reactEffectFromCallee(context, node.callee);
				if (!hook) return;
				report(
					context,
					node,
					hook,
					`${hook} is allowed only in framework owner ${WEB_OWNERS.framework}; expose a named framework hook instead of raw effects in ${layer?.kind ?? 'renderer'} code`,
				);
			},
			Identifier(node) {
				if (!hostGlobals.has(node.name) || hostOrFramework(file)) return;
				const reference = context.sourceCode.getScope(node).references.find((r) => r.identifier === node);
				if (reference?.resolved?.defs.length) return;
				report(context, node, node.name, `direct ${node.name} is allowed only in Host/framework adapters (${WEB_OWNERS.host}, ${WEB_OWNERS.framework}); Features and Client use Host ports`);
			},
			MemberExpression(node) {
				if (node.computed || node.property.type !== AST_NODE_TYPES.Identifier || !mutators.has(node.property.name) || hostOrFramework(file)) return;
				report(context, node.property, node.property.name, `DOM mutation via ${node.property.name} is allowed only in Host/framework adapters (${WEB_OWNERS.host}); keep Feature UI declarative`);
			},
			JSXAttribute(node) {
				if (node.name.type === AST_NODE_TYPES.JSXIdentifier && node.name.name === 'dangerouslySetInnerHTML') {
					report(context, node, 'dangerouslySetInnerHTML', 'dangerouslySetInnerHTML is forbidden; sanitize through Host-owned rendering adapters instead');
				}
			},
			Program(program) {
				for (const comment of context.sourceCode.getAllComments()) {
					const text = comment.value;
					const loc = { loc: comment.loc, messageId: 'forbidden' as const };
					const allow = (symbol: string): boolean => exceptionAllows(file, symbol, 'agora/renderer-footgun');
					if (/eslint-disable(?:-next-line|-line)?[\s\S]*\bagora\//.test(text) && !allow('eslint-disable')) {
						context.report({ ...loc, node: program, data: { reason: 'inline disabling of Agora architecture rules is forbidden; record a reviewed architecture exception in agora/architecture-exceptions.json' } });
					}
					if (/@ts-ignore\b/.test(text) && !allow('@ts-ignore')) {
						context.report({ ...loc, node: program, data: { reason: '@ts-ignore is forbidden; use a described @ts-expect-error only when a test contract requires it' } });
					}
					if (/@ts-expect-error\b/.test(text) && !/@ts-expect-error\s+\S+/.test(text) && !allow('@ts-expect-error')) {
						context.report({ ...loc, node: program, data: { reason: '@ts-expect-error requires a description when a test contract needs it' } });
					}
				}
			},
		};
	},
};
