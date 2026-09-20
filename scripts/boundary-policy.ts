import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils';
export const projectRoot = path.resolve(import.meta.dirname, '..');
const owners = ['contracts', 'packages/client-core', 'packages/domain', 'packages/storage', 'apps/center', 'apps/web', 'apps/worker'];
const inside = (root: string, file: string): boolean => !path.relative(root, file).startsWith('..') && !path.isAbsolute(path.relative(root, file));
const physical = (file: string): string => existsSync(file) ? realpathSync(file) : file;

function violation(file: string, specifier: string | undefined, typesOnly: boolean, program: ts.Program | null): string | undefined {
	const owner = owners.find((p) => inside(path.join(projectRoot, p), file));
	if (!owner) return undefined;
	if (!specifier) return 'nonliteral module target cannot be checked';
	const resolved = ts.resolveModuleName(specifier, file, program?.getCompilerOptions() ?? { moduleResolution: ts.ModuleResolutionKind.NodeNext }, ts.sys).resolvedModule?.resolvedFileName;
	if (specifier.startsWith('.')) {
		const target = physical(resolved ?? path.resolve(path.dirname(file), specifier));
		const boundary = file.includes('/contracts/generated/') ? 'contracts/generated' : owner;
		return inside(physical(path.join(projectRoot, boundary)), target) ? undefined : 'relative import escapes its owning package';
	}
	if (file.includes('/contracts/generated/')) return 'generated neutral values cannot import SDKs';
	if (specifier === '@agora/contracts/values') {
		return typesOnly && resolved && physical(resolved) === physical(path.join(projectRoot, 'contracts/generated/typescript/openapi.d.ts')) ? undefined : 'generated values require a type-only edge to the declared generated file';
	}
	const allowed: Record<string, string[]> = {
		'packages/client-core': [],
		'packages/domain': ['@agora/contracts/canonical', 'node:crypto'],
		'contracts': ['ajv', 'ajv-formats', 'openapi-typescript', 'node:crypto'],
		'packages/storage': ['@agora/domain', '@agora/contracts/canonical', 'pg', 'drizzle-orm', 'node:crypto', 'node:fs', 'node:path', 'node:url'],
		'apps/center': ['@agora/contracts', '@agora/domain', '@agora/storage', 'hono', '@hono/node-server', 'node:url', 'node:crypto'],
	};
	if (owner === 'contracts' && (file.includes('/tools/') || file.endsWith('/src/conform-cli.ts'))) allowed[owner]?.push('node:child_process', 'node:fs', 'node:path', 'node:url', 'node:os');
	if (owner === 'packages/storage' && file.endsWith('/src/index.ts')) return specifier === '@agora/domain' ? undefined : 'public storage entry exports domain ports, not SDK bindings';
	if (owner === 'apps/web' || owner === 'apps/worker') return specifier.startsWith('@agora/') && !['@agora/contracts', '@agora/client-core'].includes(specifier) ? 'client imports a server package' : undefined;
	if (!(allowed[owner] ?? []).some((name) => specifier === name || (name === 'ajv' || name === 'drizzle-orm') && specifier.startsWith(`${name}/`))) return `${owner} cannot import ${specifier}`;
	if (specifier === '@agora/contracts/canonical' && resolved && physical(resolved) !== physical(path.join(projectRoot, 'contracts/src/canonical.ts'))) return 'canonical export resolves outside the neutral contract utility';
	return undefined;
}

// Derive DOM global names from the pinned compiler, not a perpetually incomplete list of browser types.
const domFile = path.join(path.dirname(ts.getDefaultLibFilePath({})), 'lib.dom.d.ts');
const dom = ts.createSourceFile(domFile, readFileSync(domFile, 'utf8'), ts.ScriptTarget.Latest, true);
const globals = new Set(['globalThis', 'global', 'process', 'require', 'eval', 'Function']);
for (const statement of dom.statements) {
	if ('name' in statement && statement.name && ts.isIdentifier(statement.name as ts.Node)) globals.add((statement.name as ts.Identifier).text);
	if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) globals.add(declaration.name.text);
}

export const importBoundaryRule: TSESLint.RuleModule<'forbidden'> = {
	meta: { type: 'problem', schema: [], messages: { forbidden: '{{reason}}' } }, defaultOptions: [],
	create(context) {
		const { program } = ESLintUtils.getParserServices(context, true);
		const file = context.filename;
		const check = (node: TSESTree.Node, source: TSESTree.Node | null | undefined, typesOnly: boolean): void => {
			const specifier = source?.type === AST_NODE_TYPES.Literal && typeof source.value === 'string' ? source.value : undefined;
			const reason = violation(file, specifier, typesOnly, program);
			if (reason) context.report({ node, messageId: 'forbidden', data: { reason } });
		};
		return {
			ImportDeclaration(node) { check(node, node.source, node.importKind === 'type' || node.specifiers.length > 0 && node.specifiers.every((s) => s.type === AST_NODE_TYPES.ImportSpecifier && s.importKind === 'type')); },
			ExportNamedDeclaration(node) { if (node.source) check(node, node.source, node.exportKind === 'type' || node.specifiers.length > 0 && node.specifiers.every((s) => s.exportKind === 'type')); },
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
				if (reference && !(reference.resolved?.defs.length)) context.report({ node, messageId: 'forbidden', data: { reason: `ambient ${node.name} is outside the portable boundary` } });
			},
		};
	},
};
