import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { exceptionAllows } from './architecture-exceptions.ts';

export const projectRoot = path.resolve(import.meta.dirname, '..');
/** Test-visible owner table. Widening it is an architecture-policy change. */
export const PACKAGE_OWNERS = ['contracts', 'packages/client-core', 'packages/domain', 'packages/storage', 'apps/center', 'apps/web', 'apps/worker'] as const;
/** Reserved apps/web owners. Folders may arrive in later slices. */
export const WEB_OWNERS = { framework: 'apps/web/src/framework', client: 'apps/web/src/client', host: 'apps/web/src/host', features: 'apps/web/src/features' } as const;

const inside = (root: string, file: string): boolean => !path.relative(root, file).startsWith('..') && !path.isAbsolute(path.relative(root, file));
const physical = (file: string): string => (existsSync(file) ? realpathSync(file) : file);
const relPosix = (file: string): string => path.relative(projectRoot, file).replaceAll('\\', '/');
export type WebLayer = { kind: 'framework' | 'client' | 'host' | 'other' } | { kind: 'feature'; name: string };
export function webLayer(file: string): WebLayer | undefined {
	const rel = relPosix(file);
	if (!rel.startsWith('apps/web/')) return undefined;
	if (rel.startsWith(`${WEB_OWNERS.framework}/`)) return { kind: 'framework' };
	if (rel.startsWith(`${WEB_OWNERS.client}/`)) return { kind: 'client' };
	if (rel.startsWith(`${WEB_OWNERS.host}/`)) return { kind: 'host' };
	const match = /^apps\/web\/src\/features\/([^/]+)\//.exec(rel);
	const name = match?.[1];
	return name ? { kind: 'feature', name } : { kind: 'other' };
}
const isPublicEntrypoint = (target: string, ownerRoot: string): boolean => {
	const rel = path.relative(path.join(projectRoot, ownerRoot), target).replaceAll('\\', '/');
	return rel === 'index.ts' || rel === 'index.tsx';
};
const rendererForbidden = ['@agora/storage', '@agora/domain', '@agora/center', 'pg', 'hono', '@hono/node-server', 'drizzle-orm'] as const;
const packageAllowed: Record<string, readonly string[]> = {
	'packages/client-core': [],
	'packages/domain': ['@agora/contracts/canonical', 'node:crypto'],
	contracts: ['ajv', 'ajv-formats', 'openapi-typescript', 'node:crypto'],
	'packages/storage': ['@agora/domain', '@agora/contracts/canonical', 'pg', 'drizzle-orm', 'node:crypto', 'node:fs', 'node:path', 'node:url'],
	'apps/center': ['@agora/contracts', '@agora/domain', '@agora/storage', 'hono', '@hono/node-server', 'node:url', 'node:crypto'],
	'apps/web': ['@agora/contracts', '@agora/client-core', 'react', 'react-dom', 'react/jsx-runtime'],
	'apps/worker': ['@agora/contracts', '@agora/client-core'],
};
const contractsTooling = ['node:child_process', 'node:fs', 'node:path', 'node:url', 'node:os'] as const;
const supportedOwner = (file: string): string => {
	const layer = webLayer(file);
	if (layer?.kind === 'feature') return `Feature owner ${WEB_OWNERS.features}/${layer.name} (public entrypoints only for framework/client/host)`;
	if (layer?.kind === 'framework' || layer?.kind === 'client' || layer?.kind === 'host') return `${layer.kind} owner ${WEB_OWNERS[layer.kind]}`;
	const owner = PACKAGE_OWNERS.find((p) => inside(path.join(projectRoot, p), file));
	return owner ? `package owner ${owner}` : 'a declared package owner';
};
const prefixOk = (name: string, specifier: string): boolean => (name === 'ajv' || name === 'drizzle-orm' || name === 'react' || name === 'react-dom') && specifier.startsWith(`${name}/`);

function violation(file: string, specifier: string | undefined, typesOnly: boolean, program: ts.Program | null): string | undefined {
	const owner = PACKAGE_OWNERS.find((p) => inside(path.join(projectRoot, p), file));
	if (!owner) return undefined;
	if (!specifier) return `nonliteral module target cannot be checked; keep imports static under ${supportedOwner(file)}`;
	const resolved = ts.resolveModuleName(specifier, file, program?.getCompilerOptions() ?? { moduleResolution: ts.ModuleResolutionKind.NodeNext }, ts.sys).resolvedModule?.resolvedFileName;
	const target = specifier.startsWith('.') ? physical(resolved ?? path.resolve(path.dirname(file), specifier)) : resolved ? physical(resolved) : undefined;
	const layer = webLayer(file);
	if (specifier.startsWith('.')) {
		const resolvedTarget = target ?? path.resolve(path.dirname(file), specifier);
		if (owner === 'packages/client-core' && (inside(path.join(projectRoot, 'apps/web'), resolvedTarget) || inside(path.join(projectRoot, 'apps/center'), resolvedTarget))) {
			return `portable client-core cannot import application code; keep browser code under ${WEB_OWNERS.client} / ${WEB_OWNERS.host}`;
		}
		const boundary = file.includes('/contracts/generated/') ? 'contracts/generated' : owner;
		if (!inside(physical(path.join(projectRoot, boundary)), resolvedTarget)) return `relative import escapes ${supportedOwner(file)}; keep paths inside ${boundary}`;
		if (layer && target) {
			const targetLayer = webLayer(target);
			if ((layer.kind === 'framework' || layer.kind === 'client' || layer.kind === 'host') && targetLayer?.kind === 'feature') {
				return `${layer.kind} must not import product Features; Features live under ${WEB_OWNERS.features}/<name>`;
			}
			if (layer.kind === 'feature' && targetLayer?.kind === 'feature' && targetLayer.name !== layer.name) {
				const featureRoot = `${WEB_OWNERS.features}/${targetLayer.name}`;
				if (!isPublicEntrypoint(target, featureRoot)) return `Feature ${layer.name} cannot import private files of Feature ${targetLayer.name}; use ${featureRoot}/index.ts public entrypoint`;
			}
			if (layer.kind === 'feature' && targetLayer && targetLayer.kind !== 'feature' && targetLayer.kind !== 'other') {
				const ownerRoot = WEB_OWNERS[targetLayer.kind];
				if (!isPublicEntrypoint(target, ownerRoot)) return `Feature ${layer.name} must import ${targetLayer.kind} only through ${ownerRoot}/index.ts public entrypoint`;
			}
		}
		return undefined;
	}
	if (file.includes('/contracts/generated/')) return 'generated neutral values cannot import SDKs; generated files stay SDK-free';
	if (specifier === '@agora/contracts/values') {
		return typesOnly && resolved && physical(resolved) === physical(path.join(projectRoot, 'contracts/generated/typescript/openapi.d.ts')) ? undefined : 'generated values require a type-only edge to the declared generated file';
	}
	if (owner === 'packages/storage' && file.endsWith('/src/index.ts')) return specifier === '@agora/domain' ? undefined : 'public storage entry exports domain ports, not SDK bindings';
	if (owner === 'apps/web' || layer) {
		if (rendererForbidden.some((name) => specifier === name || specifier.startsWith(`${name}/`))) {
			return `renderer code cannot import ${specifier}; use ${WEB_OWNERS.client} / ${WEB_OWNERS.host} adapters instead of storage, domain implementation, or server packages`;
		}
		if (specifier.startsWith('@agora/') && !['@agora/contracts', '@agora/client-core'].includes(specifier) && !specifier.startsWith('@agora/contracts/') && !specifier.startsWith('@agora/client-core/')) {
			return `renderer cannot import server package ${specifier}; supported imports are @agora/contracts, @agora/client-core and the selected renderer under ${supportedOwner(file)}`;
		}
		if (specifier.startsWith('@agora/client-core/')) {
			return `renderer must import @agora/client-core only through its public entrypoint; private path ${specifier} is closed under ${supportedOwner(file)}`;
		}
		if (specifier.startsWith('@agora/contracts/') && specifier !== '@agora/contracts/canonical' && !specifier.startsWith('@agora/contracts/values')) {
			return `renderer must import contracts through published entrypoints; private path ${specifier} is closed under ${supportedOwner(file)}`;
		}
	}
	if (owner === 'apps/worker' && specifier.startsWith('@agora/') && !['@agora/contracts', '@agora/client-core'].includes(specifier)) {
		return `worker cannot import server package ${specifier}; use published contracts only`;
	}
	const allowed = [...(packageAllowed[owner] ?? []), ...(owner === 'contracts' && (file.includes('/tools/') || file.endsWith('/src/conform-cli.ts')) ? contractsTooling : [])];
	if (!allowed.some((name) => specifier === name || prefixOk(name, specifier))) {
		return owner === 'packages/client-core'
			? `portable client-core cannot import ${specifier}; keep browser and application code out of packages/client-core`
			: `${supportedOwner(file)} cannot import ${specifier}`;
	}
	if (specifier === '@agora/contracts/canonical' && resolved && physical(resolved) !== physical(path.join(projectRoot, 'contracts/src/canonical.ts'))) return 'canonical export resolves outside the neutral contract utility';
	return undefined;
}

const domFile = path.join(path.dirname(ts.getDefaultLibFilePath({})), 'lib.dom.d.ts');
const dom = ts.createSourceFile(domFile, readFileSync(domFile, 'utf8'), ts.ScriptTarget.Latest, true);
/** Authoritative browser/DOM globals from TypeScript's lib.dom.d.ts plus portable-host escapes. */
export const domGlobals = new Set(['globalThis', 'global', 'process', 'require', 'eval', 'Function']);
for (const statement of dom.statements) {
	if ('name' in statement && statement.name && ts.isIdentifier(statement.name as ts.Node)) domGlobals.add((statement.name as ts.Identifier).text);
	if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) domGlobals.add(declaration.name.text);
}
const globals = domGlobals;

export const importBoundaryRule: TSESLint.RuleModule<'forbidden'> = {
	meta: { type: 'problem', schema: [], messages: { forbidden: '{{reason}}' } }, defaultOptions: [],
	create(context) {
		const { program } = ESLintUtils.getParserServices(context, true);
		const file = context.filename;
		const check = (node: TSESTree.Node, source: TSESTree.Node | null | undefined, typesOnly: boolean): void => {
			const specifier = source?.type === AST_NODE_TYPES.Literal && typeof source.value === 'string' ? source.value : undefined;
			const reason = violation(file, specifier, typesOnly, program);
			if (!reason || exceptionAllows(file, specifier ?? 'dynamic-import', 'agora/import-boundary')) return;
			context.report({ node, messageId: 'forbidden', data: { reason } });
		};
		return {
			ImportDeclaration(node) { check(node, node.source, node.importKind === 'type' || (node.specifiers.length > 0 && node.specifiers.every((s) => s.type === AST_NODE_TYPES.ImportSpecifier && s.importKind === 'type'))); },
			ExportNamedDeclaration(node) { if (node.source) check(node, node.source, node.exportKind === 'type' || (node.specifiers.length > 0 && node.specifiers.every((s) => s.exportKind === 'type'))); },
			ExportAllDeclaration(node) { check(node, node.source, node.exportKind === 'type'); },
			ImportExpression(node) { check(node, node.source, false); },
			TSImportType(node) { check(node, node.source, true); },
			TSImportEqualsDeclaration(node) { if (node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference) check(node, node.moduleReference.expression, node.importKind === 'type'); },
			CallExpression(node) { if (node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === 'require') check(node, node.arguments[0], false); },
			Identifier(node) {
				if (!file.includes('/packages/client-core/src/') && !file.includes('/packages/domain/src/') && !file.includes('/contracts/')) return;
				if (file.includes('/contracts/tools/') || file.endsWith('/contracts/src/conform-cli.ts')) return;
				if (file.includes('/contracts/') && ['process', 'global', 'require'].includes(node.name)) return;
				if (!globals.has(node.name)) return;
				const reference = context.sourceCode.getScope(node).references.find((r) => r.identifier === node);
				if (reference && !reference.resolved?.defs.length && !exceptionAllows(file, node.name, 'agora/import-boundary')) {
					context.report({ node, messageId: 'forbidden', data: { reason: `ambient ${node.name} is outside the portable boundary; keep DOM and browser APIs in ${WEB_OWNERS.host}` } });
				}
			},
		};
	},
};
