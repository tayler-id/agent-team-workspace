import { AST_NODE_TYPES, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { exceptionAllows } from './architecture-exceptions.ts';
import { WEB_OWNERS, webLayer } from './boundary-policy.ts';

const effects = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect']);
const hostGlobals = new Set(['window', 'document', 'fetch', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'history', 'location', 'navigator', 'MutationObserver', 'ResizeObserver', 'IntersectionObserver']);
const mutators = new Set(['appendChild', 'removeChild', 'replaceChild', 'insertBefore', 'replaceChildren', 'append', 'prepend', 'remove', 'replaceWith', 'insertAdjacentElement', 'insertAdjacentHTML', 'write', 'writeln']);

const effectName = (node: TSESTree.CallExpression): string | undefined => {
	if (node.callee.type === AST_NODE_TYPES.Identifier && effects.has(node.callee.name)) return node.callee.name;
	if (node.callee.type === AST_NODE_TYPES.MemberExpression && !node.callee.computed && node.callee.property.type === AST_NODE_TYPES.Identifier && effects.has(node.callee.property.name)) return node.callee.property.name;
	return undefined;
};
const hostOrFramework = (file: string): boolean => { const layer = webLayer(file); return layer?.kind === 'host' || layer?.kind === 'framework'; };
const report = (context: TSESLint.RuleContext<'forbidden', []>, node: TSESTree.Node, symbol: string, reason: string): void => {
	if (exceptionAllows(context.filename, symbol, 'agora/renderer-footgun')) return;
	context.report({ node, messageId: 'forbidden', data: { reason } });
};

export const rendererFootgunRule: TSESLint.RuleModule<'forbidden'> = {
	meta: { type: 'problem', schema: [], messages: { forbidden: '{{reason}}' } }, defaultOptions: [],
	create(context) {
		const file = context.filename, layer = webLayer(file);
		if (!layer && !file.includes('/apps/web/')) return {};
		return {
			CallExpression(node) {
				const hook = effectName(node);
				if (hook && webLayer(file)?.kind !== 'framework') report(context, node, hook, `${hook} is allowed only in framework owner ${WEB_OWNERS.framework}; expose a named framework hook instead of raw effects in ${layer?.kind ?? 'renderer'} code`);
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
				if (node.name.type === AST_NODE_TYPES.JSXIdentifier && node.name.name === 'dangerouslySetInnerHTML') report(context, node, 'dangerouslySetInnerHTML', 'dangerouslySetInnerHTML is forbidden; sanitize through Host-owned rendering adapters instead');
			},
			Program(program) {
				for (const comment of context.sourceCode.getAllComments()) {
					const text = comment.value;
					const loc = { loc: comment.loc, messageId: 'forbidden' as const };
					const allow = (symbol: string): boolean => exceptionAllows(file, symbol, 'agora/renderer-footgun');
					if (/eslint-disable(?:-next-line|-line)?[\s\S]*\bagora\//.test(text) && !allow('eslint-disable')) context.report({ ...loc, node: program, data: { reason: 'inline disabling of Agora architecture rules is forbidden; record a reviewed architecture exception in agora/architecture-exceptions.json' } });
					if (/@ts-ignore\b/.test(text) && !allow('@ts-ignore')) context.report({ ...loc, node: program, data: { reason: '@ts-ignore is forbidden; use a described @ts-expect-error only when a test contract requires it' } });
					if (/@ts-expect-error\b/.test(text) && !/@ts-expect-error\s+\S+/.test(text) && !allow('@ts-expect-error')) context.report({ ...loc, node: program, data: { reason: '@ts-expect-error requires a description when a test contract needs it' } });
				}
			},
		};
	},
};
