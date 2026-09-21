import ts from 'typescript';
import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { exceptionAllows } from './architecture-exceptions.ts';
import { WEB_OWNERS, domGlobals, webLayer } from './boundary-policy.ts';

const effects = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect']);
const reactSources = new Set(['react', 'react/index.js', 'react/index']);
/** Method names that only make sense as DOM node mutation. */
const exclusiveMutators = new Set(['appendChild', 'removeChild', 'replaceChild', 'insertBefore', 'replaceChildren', 'replaceWith', 'insertAdjacentElement', 'insertAdjacentHTML', 'writeln']);
/** Method names that exist on non-DOM objects too; require a DOM-node receiver. */
const ambiguousMutators = new Set(['append', 'prepend', 'remove', 'write']);
const domMutationHosts = new Set(['Node', 'ParentNode', 'ChildNode', 'Element', 'HTMLElement', 'SVGElement', 'Document', 'DocumentFragment', 'CharacterData', 'Text', 'Comment', 'Range']);

const hostOrFramework = (file: string): boolean => {
	const layer = webLayer(file);
	return layer?.kind === 'host' || layer?.kind === 'framework';
};
const isFramework = (file: string): boolean => webLayer(file)?.kind === 'framework';
const isReactSource = (value: string): boolean => reactSources.has(value) || value.startsWith('react/');
const report = (context: TSESLint.RuleContext<'forbidden', []>, node: TSESTree.Node, symbol: string, reason: string): void => {
	if (exceptionAllows(context.filename, symbol, 'agora/renderer-footgun')) return;
	context.report({ node, messageId: 'forbidden', data: { reason } });
};
const importedName = (spec: TSESTree.ImportSpecifier): string | undefined => (spec.imported.type === AST_NODE_TYPES.Identifier ? spec.imported.name : undefined);
const isDomHostName = (name: string): boolean => domMutationHosts.has(name) || /^(HTML|SVG)[A-Za-z0-9]*Element$/.test(name);

const isDomLibFile = (fileName: string): boolean => fileName.endsWith('lib.dom.d.ts');

function typeIsDomMutationHost(checker: ts.TypeChecker, type: ts.Type, seen = new Set<ts.Type>()): boolean {
	if (seen.has(type)) return false;
	seen.add(type);
	if (type.isUnionOrIntersection()) return type.types.some((part) => typeIsDomMutationHost(checker, part, seen));
	const symbol = type.getSymbol() ?? type.aliasSymbol;
	if (symbol && isDomHostName(symbol.getName())) {
		const fromDom = symbol.getDeclarations()?.some((d) => isDomLibFile(d.getSourceFile().fileName));
		if (fromDom !== false) return true;
	}
	if (type.flags & ts.TypeFlags.Object) {
		try {
			for (const base of checker.getBaseTypes(type as ts.InterfaceType)) if (typeIsDomMutationHost(checker, base, seen)) return true;
		} catch { /* non-interface object types */ }
	}
	return false;
}

function propertyFromDomMutationHost(checker: ts.TypeChecker, receiver: ts.Type, method: string): boolean {
	const apparent = checker.getApparentType(receiver);
	const parts = apparent.isUnionOrIntersection() ? apparent.types : [apparent];
	for (const part of parts) {
		if (typeIsDomMutationHost(checker, part)) return true;
		const prop = checker.getPropertyOfType(part, method);
		for (const decl of prop?.getDeclarations() ?? []) {
			if (!isDomLibFile(decl.getSourceFile().fileName)) continue;
			const host = ts.findAncestor(decl, (node): node is ts.InterfaceDeclaration | ts.ClassDeclaration => ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node));
			const hostName = host && (ts.isInterfaceDeclaration(host) ? host.name.text : host.name?.text);
			if (hostName && isDomHostName(hostName)) return true;
		}
	}
	return false;
}

function isDomMutationCall(context: TSESLint.RuleContext<'forbidden', []>, member: TSESTree.MemberExpression, method: string): boolean {
	let services: ReturnType<typeof ESLintUtils.getParserServices> | undefined;
	try { services = ESLintUtils.getParserServices(context, true); } catch { services = undefined; }
	const checker = services?.program?.getTypeChecker();
	const tsObject = services ? services.esTreeNodeToTSNodeMap.get(member.object) : undefined;
	if (!checker || !tsObject) return exclusiveMutators.has(method);
	const receiver = checker.getTypeAtLocation(tsObject);
	if (propertyFromDomMutationHost(checker, receiver, method)) return true;
	if (ambiguousMutators.has(method)) return false;
	if (exclusiveMutators.has(method)) {
		const prop = checker.getPropertyOfType(checker.getApparentType(receiver), method);
		const decls = prop?.getDeclarations() ?? [];
		if (decls.length > 0 && decls.every((d) => !isDomLibFile(d.getSourceFile().fileName))) return false;
		return true;
	}
	return false;
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
		&& callee.object.type === AST_NODE_TYPES.Identifier
		&& ((callee.computed && callee.property.type === AST_NODE_TYPES.Literal && typeof callee.property.value === 'string' && effects.has(callee.property.value))
			|| (!callee.computed && callee.property.type === AST_NODE_TYPES.Identifier && effects.has(callee.property.name)))
	) {
		const hook = callee.computed && callee.property.type === AST_NODE_TYPES.Literal ? callee.property.value : (callee.property as TSESTree.Identifier).name;
		const decl = importDeclarationOf(callee.object, context);
		if (!decl || typeof decl.source.value !== 'string' || !isReactSource(decl.source.value)) return undefined;
		if (!importNamespaceOrDefault(callee.object, context)) return undefined;
		return hook;
	}
	return undefined;
}

function reactModuleFromSource(source: TSESTree.Node | null | undefined): string | undefined {
	if (source?.type === AST_NODE_TYPES.Literal && typeof source.value === 'string' && isReactSource(source.value)) return source.value;
	return undefined;
}

function denyReactEdge(context: TSESLint.RuleContext<'forbidden', []>, node: TSESTree.Node, source: TSESTree.Node | null | undefined, kind: string): void {
	if (isFramework(context.filename)) return;
	const mod = reactModuleFromSource(source);
	if (!mod) return;
	report(context, node, mod, `React ${kind} is allowed only in framework owner ${WEB_OWNERS.framework}; Features/Client/Host import named non-effect APIs or framework wrappers, not raw React effect surfaces`);
}

export const rendererFootgunRule: TSESLint.RuleModule<'forbidden'> = {
	meta: { type: 'problem', schema: [], messages: { forbidden: '{{reason}}' } },
	defaultOptions: [],
	create(context) {
		const file = context.filename;
		const layer = webLayer(file);
		if (!layer && !file.includes('/apps/web/')) return {};
		const denyEffectImport = (node: TSESTree.Node, name: string): void => {
			if (isFramework(file)) return;
			report(context, node, name, `${name} is allowed only in framework owner ${WEB_OWNERS.framework}; expose a named framework hook instead of importing raw effects in ${layer?.kind ?? 'renderer'} code`);
		};
		return {
			ImportDeclaration(node) {
				if (typeof node.source.value !== 'string' || !isReactSource(node.source.value) || isFramework(file)) return;
				for (const spec of node.specifiers) {
					if (spec.type === AST_NODE_TYPES.ImportDefaultSpecifier || spec.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
						report(context, spec, 'react', `default/namespace React import is allowed only in framework owner ${WEB_OWNERS.framework}; import named non-effect APIs instead`);
						continue;
					}
					const original = importedName(spec);
					if (original && effects.has(original) && node.importKind !== 'type' && spec.importKind !== 'type') denyEffectImport(spec, original);
				}
			},
			ExportNamedDeclaration(node) {
				if (!node.source || isFramework(file) || node.exportKind === 'type') return;
				if (!reactModuleFromSource(node.source)) return;
				const valueSpecs = node.specifiers.filter((spec) => spec.exportKind !== 'type');
				if (valueSpecs.length === 0) return;
				for (const spec of valueSpecs) {
					const name = spec.local.type === AST_NODE_TYPES.Identifier ? spec.local.name : undefined;
					if (name && effects.has(name)) denyEffectImport(spec, name);
					else report(context, spec, 'react', `React re-export is allowed only in framework owner ${WEB_OWNERS.framework}; keep Feature barrels free of raw React surfaces`);
				}
			},
			ExportAllDeclaration(node) {
				if (node.exportKind === 'type') return;
				denyReactEdge(context, node, node.source, 're-export');
			},
			ImportExpression(node) { denyReactEdge(context, node, node.source, 'dynamic import'); },
			TSImportEqualsDeclaration(node) {
				if (node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference) denyReactEdge(context, node, node.moduleReference.expression, 'import');
			},
			CallExpression(node) {
				if (node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === 'require') {
					denyReactEdge(context, node, node.arguments[0], 'require');
				}
				if (isFramework(file)) return;
				const hook = reactEffectFromCallee(context, node.callee);
				if (!hook) return;
				report(context, node, hook, `${hook} is allowed only in framework owner ${WEB_OWNERS.framework}; expose a named framework hook instead of raw effects in ${layer?.kind ?? 'renderer'} code`);
			},
			Identifier(node) {
				if (!domGlobals.has(node.name) || hostOrFramework(file)) return;
				const reference = context.sourceCode.getScope(node).references.find((r) => r.identifier === node);
				// Value references only: type names, keys, members and Host-port bindings stay allowed.
				if (!(reference && reference.isValueReference && !reference.resolved?.defs.length)) return;
				report(context, node, node.name, `direct ${node.name} is allowed only in Host/framework adapters (${WEB_OWNERS.host}, ${WEB_OWNERS.framework}); Features and Client use Host ports`);
			},
			MemberExpression(node) {
				if (node.property.type !== AST_NODE_TYPES.Identifier || hostOrFramework(file)) return;
				const method = node.property.name;
				if (!exclusiveMutators.has(method) && !ambiguousMutators.has(method)) return;
				if (node.computed) return;
				if (!isDomMutationCall(context, node, method)) return;
				report(context, node.property, method, `DOM mutation via ${method} is allowed only in Host/framework adapters (${WEB_OWNERS.host}); keep Feature UI declarative`);
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
					if (/^\s*eslint-disable(?:-next-line|-line)?\b/.test(text) && !allow('eslint-disable')) {
						context.report({ ...loc, node: program, data: { reason: 'inline ESLint disables cannot suppress Agora architecture rules; linterOptions.noInlineConfig owns this and reviewed exceptions live in agora/architecture-exceptions.json' } });
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
