import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { ESLintUtils, type TSESLint } from '@typescript-eslint/utils';
import { projectRoot } from './boundary-policy.ts';

export function readPublicEntries(root: string = projectRoot): { entries: string[]; errors: string[] } {
	const packages = ['contracts', ...['packages', 'apps'].flatMap((dir) => readdirSync(path.join(root, dir), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => `${dir}/${e.name}`))];
	const entries: string[] = [], errors: string[] = [];
	for (const pkg of packages) {
		const file = path.join(root, pkg, 'package.json');
		if (!existsSync(file)) continue;
		const manifest = JSON.parse(readFileSync(file, 'utf8')) as { exports?: unknown };
		if (!manifest.exports || typeof manifest.exports !== 'object') { errors.push(`${pkg}: an explicit export map is required`); continue; }
		for (const [key, value] of Object.entries(manifest.exports)) if (key.includes('*') && !(pkg === 'contracts' && key === './schemas/*' && value === './schemas/*')) errors.push(`${pkg}: wildcard private-code exports are forbidden`);
		const collect = (value: unknown): void => {
			if (typeof value === 'string') {
				const target = path.resolve(root, pkg, value);
				if (!value.startsWith('./') || path.relative(path.join(root, pkg), target).startsWith('..')) errors.push(`${pkg}: export target escapes package`);
				else if (/\.[cm]?ts$/.test(target)) entries.push(target);
			} else if (value && typeof value === 'object') Object.values(value).forEach(collect);
		};
		collect(manifest.exports);
	}
	return { entries: [...new Set(entries)], errors };
}

// Follow exported types, not just direct imports: signatures, callbacks, aliases, unions and generic arguments.
function leaks(program: ts.Program, entries: string[]): string[] {
	const checker = program.getTypeChecker(), failures = new Set<string>();
	for (const entry of entries) {
		const file = program.getSourceFile(entry), module = file && checker.getSymbolAtLocation(file);
		if (!module) { failures.add(`${path.relative(projectRoot, entry)}: public entry is outside the checked program`); continue; }
		for (let exported of checker.getExportsOfModule(module)) {
			if (exported.flags & ts.SymbolFlags.Alias) exported = checker.getAliasedSymbol(exported);
			const declaration = exported.valueDeclaration ?? exported.declarations?.[0];
			if (!declaration) continue;
			const seen = new Set<ts.Type>();
			const visit = (type: ts.Type): void => {
				if (seen.has(type)) return;
				seen.add(type);
				for (const symbol of [type.aliasSymbol, type.getSymbol()]) for (const decl of symbol?.declarations ?? []) {
					const origin = decl.getSourceFile().fileName;
					// @agora/web-framework is a React package: ReactElement/ReactNode on AgoraProvider are intentional substrate, not an SDK leak.
					const allowReact = entry.includes(`${path.sep}packages${path.sep}web-framework${path.sep}`) && origin.includes(`${path.sep}@types${path.sep}react${path.sep}`);
					if (!allowReact && origin.includes('/node_modules/') && (!origin.includes('/typescript/lib/') || /\/lib\.(dom|webworker)/.test(origin))) {
						failures.add(`${path.relative(projectRoot, entry)}: ${exported.name} exposes SDK type ${symbol?.name ?? 'unknown'} (${origin.slice(origin.lastIndexOf('/node_modules/') + 14)})`);
						return;
					}
				}
				if (type.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.BigIntLike | ts.TypeFlags.ESSymbolLike | ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Void | ts.TypeFlags.Never | ts.TypeFlags.Null | ts.TypeFlags.Undefined)) return;
				type.aliasTypeArguments?.forEach(visit);
				if (type.isUnionOrIntersection()) type.types.forEach(visit);
				if (type.flags & ts.TypeFlags.Object && (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) checker.getTypeArguments(type as ts.TypeReference).forEach(visit);
				if (type.flags & ts.TypeFlags.Object && (type as ts.ObjectType).objectFlags & (ts.ObjectFlags.Class | ts.ObjectFlags.Interface)) checker.getBaseTypes(type as ts.InterfaceType).forEach(visit);
				if (type.getSymbol()?.declarations?.every((d) => d.getSourceFile().fileName.includes('/typescript/lib/'))) return;
				const constraint = type.getConstraint();
				if (constraint) visit(constraint);
				for (const signature of [...type.getCallSignatures(), ...type.getConstructSignatures()]) {
					visit(signature.getReturnType());
					signature.typeParameters?.forEach(visit);
					for (const parameter of signature.parameters) visit(checker.getTypeOfSymbolAtLocation(parameter, parameter.valueDeclaration ?? declaration));
				}
				for (const property of type.getProperties()) {
					const own = property.valueDeclaration ?? property.declarations?.[0];
					// Base types were checked above; inherited ambient Error instrumentation is not a declared port.
					if (own?.getSourceFile().fileName.includes('/node_modules/')) continue;
					visit(checker.getTypeOfSymbolAtLocation(property, own ?? declaration));
				}
				for (const index of checker.getIndexInfosOfType(type)) { visit(index.keyType); visit(index.type); }
			};
			visit(checker.getTypeOfSymbolAtLocation(exported, declaration));
			if (exported.flags & ts.SymbolFlags.Type) visit(checker.getDeclaredTypeOfSymbol(exported));
		}
	}
	return [...failures].sort();
}
export const publicTypesRule: TSESLint.RuleModule<'leak'> = {
	meta: { type: 'problem', schema: [], messages: { leak: '{{reason}}' } }, defaultOptions: [],
	create(context) {
		const { program } = ESLintUtils.getParserServices(context);
		return { 'Program:exit'(node) {
			const { entries, errors } = readPublicEntries();
			const parts = path.relative(projectRoot, context.filename).split(path.sep);
			const owner = path.join(projectRoot, ...(parts[0] === 'contracts' ? parts.slice(0, 1) : parts.slice(0, 2)));
			const owned = entries.filter((entry) => !path.relative(owner, entry).startsWith('..'));
			for (const reason of [...errors, ...leaks(program, owned)]) context.report({ node, messageId: 'leak', data: { reason } });
		} };
	},
};
