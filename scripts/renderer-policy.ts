import ts from 'typescript';
import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { exceptionAllows } from './architecture-exceptions.ts';
import { WEB_OWNERS, domGlobals, isWebTestOrConfig, webLayer } from './boundary-policy.ts';

const effects = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect']);
const reactSources = new Set(['react', 'react/index.js', 'react/index']);
const exclusiveMutators = new Set(['appendChild', 'removeChild', 'replaceChild', 'insertBefore', 'replaceChildren', 'replaceWith', 'insertAdjacentElement', 'insertAdjacentHTML', 'writeln']);
const ambiguousMutators = new Set(['append', 'prepend', 'remove', 'write']);
const allMutators = new Set([...exclusiveMutators, ...ambiguousMutators]);
const domMutationHosts = new Set(['Node', 'ParentNode', 'ChildNode', 'Element', 'HTMLElement', 'SVGElement', 'Document', 'DocumentFragment', 'CharacterData', 'Text', 'Comment', 'Range']);

const hostOrFramework = (file: string): boolean => { const l = webLayer(file); return l?.kind === 'host' || l?.kind === 'framework'; };
const isFramework = (file: string): boolean => webLayer(file)?.kind === 'framework';
// @agora/web-framework is the portable Client/hooks layer outside apps/web: it may use raw React effects to
// implement named hooks, exactly like apps/web/src/framework, but it never gets the Host exemption for raw
// window/document/crypto/DOM-mutation access below; only apps/web/src/host and apps/web/src/framework get that.
const isPortableFramework = (file: string): boolean => file.includes('/packages/web-framework/src/');
const isFrameworkLike = (file: string): boolean => isFramework(file) || isPortableFramework(file);
const isReactSource = (value: string): boolean => reactSources.has(value) || value.startsWith('react/');
const report = (context: TSESLint.RuleContext<'forbidden', []>, node: TSESTree.Node, symbol: string, reason: string): void => {
	if (exceptionAllows(context.filename, symbol, 'agora/renderer-footgun')) return;
	context.report({ node, messageId: 'forbidden', data: { reason } });
};
const importedName = (spec: TSESTree.ImportSpecifier): string | undefined => {
	const imported = spec.imported;
	if (imported.type === AST_NODE_TYPES.Identifier) return imported.name;
	return typeof imported.value === 'string' ? imported.value : undefined;
};
const exportLocalName = (spec: TSESTree.ExportSpecifier): string | undefined => {
	const local = spec.local;
	if (local.type === AST_NODE_TYPES.Identifier) return local.name;
	return typeof local.value === 'string' ? local.value : undefined;
};
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
		try { for (const base of checker.getBaseTypes(type as ts.InterfaceType)) if (typeIsDomMutationHost(checker, base, seen)) return true; } catch { /* non-interface */ }
	}
	return false;
}

function propertyFromDomMutationHost(checker: ts.TypeChecker, receiver: ts.Type, method: string): boolean {
	const apparent = checker.getApparentType(receiver);
	for (const part of apparent.isUnionOrIntersection() ? apparent.types : [apparent]) {
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

/** Resolve method names including computed keys and mutator unions (`'append' | 'prepend'`, `'remove' | 'normalize'`). */
function memberMethodNames(context: TSESLint.RuleContext<'forbidden', []>, member: TSESTree.MemberExpression): string[] {
	if (!member.computed && member.property.type === AST_NODE_TYPES.Identifier) return [member.property.name];
	if (member.computed && member.property.type === AST_NODE_TYPES.Literal && typeof member.property.value === 'string') return [member.property.value];
	if (!member.computed) return [];
	try {
		const services = ESLintUtils.getParserServices(context, true);
		if (services.program === null) return [];
		const checker = services.program.getTypeChecker();
		const type = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(member.property));
		if (type.isStringLiteral()) return allMutators.has(type.value) ? [type.value] : [];
		if (type.isUnion()) {
			const literals = type.types.filter((part): part is ts.StringLiteralType => part.isStringLiteral());
			// Keep every mutator alternate, including ambiguous names mixed with ordinary methods; receiver check filters non-DOM.
			return literals.map((part) => part.value).filter((name) => allMutators.has(name));
		}
	} catch { return []; }
	return [];
}

function nodeIsDeclare(node: TSESTree.Node | null | undefined): boolean {
	if (!node || !('declare' in node)) return false;
	const flag: unknown = Reflect.get(node, 'declare');
	return typeof flag === 'boolean' ? flag : false;
}
function defsAreOnlyAmbient(defs: readonly { type: string; node: TSESTree.Node; parent?: TSESTree.Node | null }[]): boolean {
	return defs.length === 0 || defs.every((def) => nodeIsDeclare(def.parent) || nodeIsDeclare(def.node));
}

function importBinding(identifier: TSESTree.Identifier, context: TSESLint.RuleContext<'forbidden', []>): { decl: TSESTree.ImportDeclaration | undefined; spec: TSESTree.ImportSpecifier | undefined; nsOrDefault: boolean } {
	let current: ReturnType<TSESLint.SourceCode['getScope']> | null = context.sourceCode.getScope(identifier);
	while (current) {
		const variable = current.set.get(identifier.name);
		if (variable) {
			const def = variable.defs[0];
			if (def === undefined || (def.type as string) !== 'ImportBinding') return { decl: undefined, spec: undefined, nsOrDefault: false };
			const parent = def.parent as TSESTree.Node | null | undefined;
			return {
				decl: parent?.type === AST_NODE_TYPES.ImportDeclaration ? parent : undefined,
				spec: def.node.type === AST_NODE_TYPES.ImportSpecifier ? def.node : undefined,
				nsOrDefault: def.node.type === AST_NODE_TYPES.ImportNamespaceSpecifier || def.node.type === AST_NODE_TYPES.ImportDefaultSpecifier,
			};
		}
		current = current.upper;
	}
	return { decl: undefined, spec: undefined, nsOrDefault: false };
}

function reactEffectFromCallee(context: TSESLint.RuleContext<'forbidden', []>, callee: TSESTree.Expression): string | undefined {
	if (callee.type === AST_NODE_TYPES.Identifier) {
		const { decl, spec } = importBinding(callee, context);
		if (!decl || !spec || typeof decl.source.value !== 'string' || !isReactSource(decl.source.value)) return undefined;
		const original = importedName(spec);
		return original && effects.has(original) ? original : undefined;
	}
	if (callee.type === AST_NODE_TYPES.MemberExpression && callee.object.type === AST_NODE_TYPES.Identifier) {
		const hook = !callee.computed && callee.property.type === AST_NODE_TYPES.Identifier && effects.has(callee.property.name)
			? callee.property.name
			: callee.computed && callee.property.type === AST_NODE_TYPES.Literal && typeof callee.property.value === 'string' && effects.has(callee.property.value)
				? callee.property.value
				: undefined;
		if (!hook) return undefined;
		const { decl, nsOrDefault } = importBinding(callee.object, context);
		if (!decl || !nsOrDefault || typeof decl.source.value !== 'string' || !isReactSource(decl.source.value)) return undefined;
		return hook;
	}
	return undefined;
}

function reactModuleFromSource(source: TSESTree.Node | null | undefined): string | undefined {
	return source?.type === AST_NODE_TYPES.Literal && typeof source.value === 'string' && isReactSource(source.value) ? source.value : undefined;
}

function denyReactEdge(context: TSESLint.RuleContext<'forbidden', []>, node: TSESTree.Node, source: TSESTree.Node | null | undefined, kind: string): void {
	if (isFrameworkLike(context.filename)) return;
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
		// apps/web/test/** and apps/web/*.config.ts are the test/config owner: jsdom component tests and build
		// config legitimately touch window/document/raw effects to assert on rendered output; they carry no
		// production behavior and cannot be imported back into apps/web/src (see boundary-policy.ts's WEB_SRC guard).
		if (isWebTestOrConfig(file)) return {};
		if (!layer && !file.includes('/apps/web/') && !isPortableFramework(file)) return {};
		const denyEffectImport = (node: TSESTree.Node, name: string): void => {
			if (isFrameworkLike(file)) return;
			report(context, node, name, `${name} is allowed only in framework owner ${WEB_OWNERS.framework}; expose a named framework hook instead of importing raw effects in ${layer?.kind ?? 'renderer'} code`);
		};
		return {
			ImportDeclaration(node) {
				if (typeof node.source.value !== 'string' || !isReactSource(node.source.value) || isFrameworkLike(file)) return;
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
				if (!node.source || isFrameworkLike(file) || node.exportKind === 'type') return;
				if (!reactModuleFromSource(node.source)) return;
				for (const spec of node.specifiers.filter((s) => s.exportKind !== 'type')) {
					const name = exportLocalName(spec);
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
				if (node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === 'require') denyReactEdge(context, node, node.arguments[0], 'require');
				if (isFrameworkLike(file)) return;
				const hook = reactEffectFromCallee(context, node.callee);
				if (hook) report(context, node, hook, `${hook} is allowed only in framework owner ${WEB_OWNERS.framework}; expose a named framework hook instead of raw effects in ${layer?.kind ?? 'renderer'} code`);
			},
			Identifier(node) {
				if (!domGlobals.has(node.name) || hostOrFramework(file)) return;
				const reference = context.sourceCode.getScope(node).references.find((r) => r.identifier === node);
				if (!reference?.isValueReference) return;
				const defs = reference.resolved?.defs ?? [];
				if (defs.length > 0 && !defsAreOnlyAmbient(defs)) return;
				report(context, node, node.name, `direct ${node.name} is allowed only in Host/framework adapters (${WEB_OWNERS.host}, ${WEB_OWNERS.framework}); Features and Client use Host ports`);
			},
			MemberExpression(node) {
				if (hostOrFramework(file)) return;
				const methods = memberMethodNames(context, node);
				const method = methods.find((name) => allMutators.has(name) && isDomMutationCall(context, node, name));
				if (!method) return;
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
