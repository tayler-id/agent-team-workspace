import ts from 'typescript';
import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { WEB_OWNERS, isWebTestOrConfig, projectRoot, webLayer } from './boundary-policy.ts';
import { importBinding, importedName, isReactSource } from './renderer-policy.ts';

const SANCTIONED_READ = 'useClientSelector / useTranscript / useTransportState (@agora/web-framework)';
const SANCTIONED_WRITE = 'useRoomCommands / useSetDraft / useDiscardCommand (@agora/web-framework)';
const stateHooks = new Set(['useState', 'useReducer', 'useRef', 'createContext']);
/** Client construction belongs to the entrypoint and Host; a component receives the Client through the provider. */
const clientConstructors = new Set(['createRoomClient', 'AgoraProvider']);
const transportCommands = new Set(['loadSnapshot', 'submit', 'markSeen', 'disconnect', 'reconnect', 'saveDraft']);
/** web-framework projection types that restate durable room/timeline state; display-only inputs (Presentation, Author, RoomHeader) stay free. */
const durableProjections = new Set(['Room', 'FrozenMessage', 'Row', 'Window', 'RoomStatus', 'ComposerStatus', 'ComposerCommand', 'Connection']);
const inPackage = (decl: ts.Declaration, pkg: string): boolean => decl.getSourceFile().fileName.replaceAll('\\', '/').includes(`/${pkg}/`);
const fromFile = (decl: ts.Declaration, suffix: string): boolean => decl.getSourceFile().fileName.replaceAll('\\', '/').endsWith(suffix);
const entrypoint = (file: string): boolean => /\/apps\/web\/src\/main[^/]*\.tsx?$/.test(file.replaceAll('\\', '/'));

/** The durable Client type a state holder would copy, found through aliases, unions, generic arguments and anonymous object properties. */
function durableName(checker: ts.TypeChecker, type: ts.Type, seen = new Set<ts.Type>(), depth = 0): string | undefined {
	if (seen.has(type) || depth > 4) return undefined;
	seen.add(type);
	for (const symbol of [type.aliasSymbol, type.getSymbol()]) {
		const decls = symbol?.getDeclarations() ?? [];
		if (symbol && decls.some((d) => inPackage(d, 'packages/client-core/src') || (fromFile(d, '/packages/web-framework/src/projection.ts') && durableProjections.has(symbol.getName())))) return symbol.getName();
	}
	const parts = type.isUnionOrIntersection() ? type.types : [];
	const args = [...(type.aliasTypeArguments ?? []), ...(type.flags & ts.TypeFlags.Object && (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference ? checker.getTypeArguments(type as ts.TypeReference) : [])];
	const props = type.flags & ts.TypeFlags.Object && (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Anonymous && type.getCallSignatures().length === 0 ? type.getProperties().map((p) => checker.getTypeOfSymbol(p)) : [];
	for (const next of [...parts, ...args, ...props]) {
		const found = durableName(checker, next, seen, depth + 1);
		if (found) return found;
	}
	return undefined;
}

const isRoomTransport = (type: ts.Type): boolean => type.getSymbol()?.getName() === 'RoomTransport' && (type.getSymbol()?.getDeclarations() ?? []).some((d) => fromFile(d, '/packages/web-framework/src/environment.ts'));

export const clientOwnerRule: TSESLint.RuleModule<'forbidden'> = {
	meta: { type: 'problem', schema: [], messages: { forbidden: '{{reason}}' } },
	defaultOptions: [],
	create(context) {
		const file = context.filename;
		const layer = webLayer(file);
		// Only renderer code that is neither an owner nor a test: Features and un-owned apps/web/src components.
		if (isWebTestOrConfig(file) || entrypoint(file) || (layer?.kind !== 'feature' && layer?.kind !== 'other') || !file.startsWith(projectRoot)) return {};
		let services: ReturnType<typeof ESLintUtils.getParserServices> | undefined;
		try { services = ESLintUtils.getParserServices(context, true); } catch { services = undefined; }
		const checker = services?.program?.getTypeChecker();
		const typeAt = (node: TSESTree.Node): ts.Type | undefined => (checker && services ? checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node)) : undefined);
		const flag = (node: TSESTree.Node, reason: string): void => { context.report({ node, messageId: 'forbidden', data: { reason } }); };
		const importEdge = (node: TSESTree.Node, source: string, specs: readonly { name: string | undefined; type: boolean }[], whole: boolean): void => {
			const values = specs.filter((s) => !s.type);
			if (source === '@agora/client-core' && (whole || values.length > 0)) {
				flag(node, `Client core runtime (${values.map((s) => s.name ?? '*').join(', ') || '*'}) is owned by ${WEB_OWNERS.client}; a component reads durable state with ${SANCTIONED_READ} and writes with ${SANCTIONED_WRITE}, importing only types from @agora/client-core`);
			}
			const ctor = values.find((s) => s.name !== undefined && clientConstructors.has(s.name));
			if (source === '@agora/web-framework' && ctor) {
				flag(node, `${ctor.name} constructs or provides the Client and is allowed only in the entrypoint and ${WEB_OWNERS.host}; components receive it through the provider and use ${SANCTIONED_READ}`);
			}
		};
		return {
			ImportDeclaration(node) {
				if (typeof node.source.value !== 'string' || node.importKind === 'type') return;
				importEdge(node, node.source.value, node.specifiers.map((s) => ({ name: s.type === AST_NODE_TYPES.ImportSpecifier ? importedName(s) : undefined, type: s.type === AST_NODE_TYPES.ImportSpecifier && s.importKind === 'type' })), false);
			},
			ExportNamedDeclaration(node) {
				if (!node.source || node.exportKind === 'type') return;
				importEdge(node, node.source.value, node.specifiers.map((s) => ({ name: s.local.type === AST_NODE_TYPES.Identifier ? s.local.name : s.local.value, type: s.exportKind === 'type' })), false);
			},
			ExportAllDeclaration(node) { if (node.exportKind !== 'type') importEdge(node, node.source.value, [], true); },
			CallExpression(node) {
				if (!checker || node.callee.type !== AST_NODE_TYPES.Identifier) return;
				const { decl, spec } = importBinding(node.callee, context);
				const hook = spec && decl && typeof decl.source.value === 'string' && isReactSource(decl.source.value) ? importedName(spec) : undefined;
				if (!hook || !stateHooks.has(hook)) return;
				const type = typeAt(node);
				const held = type && durableName(checker, type);
				if (held) flag(node, `${hook} holds ${held}, durable room/timeline state owned by the Client (${WEB_OWNERS.client}); read it with ${SANCTIONED_READ} and change it through ${SANCTIONED_WRITE} instead of keeping a copy in component state. Component-local UI state (open, selected id, input text) stays allowed`);
			},
			MemberExpression(node) {
				const name = !node.computed && node.property.type === AST_NODE_TYPES.Identifier ? node.property.name : undefined;
				const type = name && transportCommands.has(name) ? typeAt(node.object) : undefined;
				if (name && type && isRoomTransport(type)) flag(node.property, `transport.${name} is a Host command; a component sends through ${SANCTIONED_WRITE}, never the transport itself (typed Host: ${WEB_OWNERS.host})`);
			},
			VariableDeclarator(node) {
				if (node.id.type !== AST_NODE_TYPES.ObjectPattern || !node.init) return;
				const type = typeAt(node.init);
				if (!type || !isRoomTransport(type)) return;
				for (const prop of node.id.properties) {
					if (prop.type === AST_NODE_TYPES.Property && prop.key.type === AST_NODE_TYPES.Identifier && transportCommands.has(prop.key.name)) flag(prop, `destructuring transport.${prop.key.name} bypasses the Client commands; use ${SANCTIONED_WRITE} (typed Host: ${WEB_OWNERS.host})`);
				}
			},
		};
	},
};
