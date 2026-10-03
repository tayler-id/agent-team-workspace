import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
import { exceptionAllows } from './architecture-exceptions.ts';

export const projectRoot = path.resolve(import.meta.dirname, '..');
/** Test-visible owner table. Widening it is an architecture-policy change. */
export const PACKAGE_OWNERS = ['contracts', 'packages/client-core', 'packages/web-framework', 'packages/domain', 'packages/storage', 'apps/center', 'apps/web', 'apps/worker'] as const;
/** Reserved apps/web owners. Folders may arrive in later slices. */
export const WEB_OWNERS = { framework: 'apps/web/src/framework', client: 'apps/web/src/client', host: 'apps/web/src/host', features: 'apps/web/src/features' } as const;
const WEB_SRC = 'apps/web/src';
/** The one file allowed to import @chenglou/pretext; every other apps/web path, including the rest of the host owner, is denied. */
export const TEXT_SIZING_ADAPTER = 'apps/web/src/host/pretext.ts';
/** The one non-`.test.tsx?` file under apps/web/test that gets the test/config owner: a jsdom geometry double
 * consumed only by timeline/app test files. Named exactly, not directory-scoped, for the same reason as the
 * `.test.tsx?` restriction below: it carries no production behavior and the WEB_SRC guard already blocks any
 * apps/web/src file from importing it back in. */
export const TEST_GEOMETRY_DOUBLE = 'apps/web/test/geometry.ts';
/** The one file allowed to import @tanstack/react-virtual; every other apps/web path is denied. */
export const VIRTUALIZER_ADAPTER = 'apps/web/src/framework/useTimelineVirtualizer.ts';

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
	const name = /^apps\/web\/src\/features\/([^/]+)\//.exec(rel)?.[1];
	return name ? { kind: 'feature', name } : { kind: 'other' };
}
const isPublicEntrypoint = (target: string, ownerRoot: string): boolean => {
	const rel = path.relative(path.join(projectRoot, ownerRoot), target).replaceAll('\\', '/');
	return rel === 'index.ts' || rel === 'index.tsx';
};
const rendererForbidden = ['@agora/storage', '@agora/domain', '@agora/center', 'pg', 'hono', '@hono/node-server', 'drizzle-orm'] as const;
const packageAllowed: Record<string, readonly string[]> = {
	'packages/client-core': [],
	'packages/web-framework': ['@agora/client-core', 'react'],
	'packages/domain': ['@agora/contracts/canonical', 'node:crypto'],
	contracts: ['ajv', 'ajv-formats', 'openapi-typescript', 'node:crypto'],
	'packages/storage': ['@agora/domain', '@agora/contracts/canonical', 'pg', 'drizzle-orm', 'node:crypto', 'node:fs', 'node:path', 'node:url'],
	'apps/center': ['@agora/contracts', '@agora/domain', '@agora/storage', 'hono', '@hono/node-server', 'node:url', 'node:crypto'],
	'apps/web': ['@agora/contracts', '@agora/client-core', '@agora/web-framework', 'react', 'react-dom', 'react/jsx-runtime', '@chenglou/pretext', '@tanstack/react-virtual'],
	'apps/worker': ['@agora/contracts', '@agora/client-core'],
};
const contractsTooling = ['node:child_process', 'node:fs', 'node:path', 'node:url', 'node:os'] as const;
/**
 * Narrow, explicit dev-tooling allow-list for apps/web/test/*.test.ts(x) and apps/web root *.config.ts only;
 * production apps/web/src files never get this owner. Deliberately named-file-scoped (not directory-scoped):
 * a non-test file placed under apps/web/test/ (a relocation bypass attempt) still gets the strict renderer
 * checks, exactly like a file placed anywhere else outside its owner.
 */
const webTestConfigAllowed = ['@agora/contracts', '@agora/contracts/browser-validator', '@agora/client-core', '@agora/web-framework', 'react', 'react-dom', 'react/jsx-runtime', 'vitest', 'vitest/config', '@testing-library/react', '@testing-library/dom', '@vitejs/plugin-react', 'vite', 'node:child_process', 'node:fs', 'node:path'] as const;
export const isWebTestOrConfig = (file: string): boolean => {
	const rel = relPosix(file);
	return (rel.startsWith('apps/web/test/') && /\.test\.tsx?$/.test(rel)) || /^apps\/web\/[^/]+\.config\.ts$/.test(rel) || rel === TEST_GEOMETRY_DOUBLE;
};
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
		// apps/web renderer code may only relative-import inside apps/web/src (blocks test/lib relocation bypass);
		// test/config owner files are exempt here too, so a test may relative-import a sibling test double like
		// apps/web/test/geometry.ts (isWebTestOrConfig already gives them a separate, stricter absolute-import list).
		if ((owner === 'apps/web' || layer) && !isWebTestOrConfig(file)) {
			const targetRel = relPosix(resolvedTarget);
			if (!targetRel.startsWith(`${WEB_SRC}/`) && !targetRel.includes('node_modules')) {
				return `relative import escapes ${WEB_SRC}; renderer code stays under ${WEB_SRC}/{framework,client,host,features} (not apps/web/test or other non-src paths)`;
			}
		}
		if (layer && target) {
			const targetLayer = webLayer(target);
			// Non-feature importers (framework/client/host/other) cannot reach Features, closing un-owned src relays.
			if (layer.kind !== 'feature' && targetLayer?.kind === 'feature') {
				return `${layer.kind} must not import product Features; Features live under ${WEB_OWNERS.features}/<name>`;
			}
			if (layer.kind === 'feature' && targetLayer?.kind === 'feature' && targetLayer.name !== layer.name) {
				const featureRoot = `${WEB_OWNERS.features}/${targetLayer.name}`;
				if (!isPublicEntrypoint(target, featureRoot)) return `Feature ${layer.name} cannot import private files of Feature ${targetLayer.name}; use ${featureRoot}/index.ts public entrypoint`;
			}
			// Features and un-owned src files must use public framework/client/host entrypoints only.
			if ((layer.kind === 'feature' || layer.kind === 'other') && targetLayer && targetLayer.kind !== 'feature' && targetLayer.kind !== 'other') {
				const ownerRoot = WEB_OWNERS[targetLayer.kind];
				if (!isPublicEntrypoint(target, ownerRoot)) {
					const who = layer.kind === 'feature' ? `Feature ${layer.name}` : 'other';
					return `${who} must import ${targetLayer.kind} only through ${ownerRoot}/index.ts public entrypoint`;
				}
			}
		}
		return undefined;
	}
	if (file.includes('/contracts/generated/')) return 'generated neutral values cannot import SDKs; generated files stay SDK-free';
	if (specifier === '@agora/contracts/values') {
		return typesOnly && resolved && physical(resolved) === physical(path.join(projectRoot, 'contracts/generated/typescript/openapi.d.ts')) ? undefined : 'generated values require a type-only edge to the declared generated file';
	}
	if (owner === 'packages/storage' && file.endsWith('/src/index.ts')) return specifier === '@agora/domain' ? undefined : 'public storage entry exports domain ports, not SDK bindings';
	if (owner === 'apps/web' && isWebTestOrConfig(file)) {
		return webTestConfigAllowed.some((name) => specifier === name || prefixOk(name, specifier)) ? undefined : `apps/web test/config owner cannot import ${specifier}; only dev-tooling and the app's own public surface are allowed here`;
	}
	if (owner === 'apps/web' || layer) {
		if ((specifier === '@chenglou/pretext' || specifier.startsWith('@chenglou/pretext/')) && relPosix(file) !== TEXT_SIZING_ADAPTER) {
			return `Pretext is allowed only behind the text-sizing adapter ${TEXT_SIZING_ADAPTER}; ${supportedOwner(file)} must go through the Host TextSizer, not import Pretext directly`;
		}
		if ((specifier === '@tanstack/react-virtual' || specifier.startsWith('@tanstack/react-virtual/')) && relPosix(file) !== VIRTUALIZER_ADAPTER) {
			return `react-virtual is allowed only behind the virtualization adapter ${VIRTUALIZER_ADAPTER}; ${supportedOwner(file)} must go through useTimelineVirtualizer, not import react-virtual directly`;
		}
		if (rendererForbidden.some((name) => specifier === name || specifier.startsWith(`${name}/`))) {
			return `renderer code cannot import ${specifier}; use ${WEB_OWNERS.client} / ${WEB_OWNERS.host} adapters instead of storage, domain implementation, or server packages`;
		}
		if (specifier.startsWith('@agora/') && !['@agora/contracts', '@agora/client-core', '@agora/web-framework'].includes(specifier) && !specifier.startsWith('@agora/contracts/') && !specifier.startsWith('@agora/client-core/')) {
			return `renderer cannot import server package ${specifier}; supported imports are @agora/contracts, @agora/client-core, @agora/web-framework and the selected renderer under ${supportedOwner(file)}`;
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
		let tsProgram: ts.Program | null = null;
		try { tsProgram = ESLintUtils.getParserServices(context, true).program; } catch { tsProgram = null; }
		const file = context.filename;
		const check = (node: TSESTree.Node, source: TSESTree.Node | null | undefined, typesOnly: boolean): void => {
			const specifier = source?.type === AST_NODE_TYPES.Literal && typeof source.value === 'string' ? source.value : undefined;
			const reason = violation(file, specifier, typesOnly, tsProgram);
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
			// A .js/.mjs/.cjs file under a guarded root has no TSImportType AST node for a JSDoc `@type
			// {import('mod').X}` edge (the TS parser leaves JSDoc as comment text unless a checker resolves
			// it); scan comments directly so a forbidden module cannot be smuggled past guarded JS this way.
			Program(node) {
				const re = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
				for (const comment of context.sourceCode.getAllComments()) {
					for (const match of comment.value.matchAll(re)) {
						const specifier = match[1] ?? '';
						const reason = violation(file, specifier, true, tsProgram);
						if (reason && !exceptionAllows(file, specifier, 'agora/import-boundary')) {
							context.report({ node, messageId: 'forbidden', data: { reason: `JSDoc ${reason}` } });
						}
					}
				}
			},
		};
	},
};
