// Bundles contracts/openapi.json with contracts/schemas/*.schema.json into one OpenAPI 3.1.1 document,
// rejects any schema keyword outside the subset both generators represent faithfully, then generates the
// TypeScript (openapi-typescript) and Swift (swift-openapi-generator) consumers and a digest manifest.
// Usage: node contracts/tools/generate.mjs [--check] [--subset-only] [--schemas DIR] [--against DIR]
// --check regenerates into a clean temporary directory and fails on any byte difference from the committed outputs.
// --subset-only stops after bundling and schema validation (no generators); --schemas and --operations read other
// sources and --against compares a check run with another tree root. The tests use these for guard negatives.
// Exit codes follow R12: 0 pass, 1 drift or subset violation, 3 unavailable generator, 70 infrastructure failure.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import openapiTS, { astToString } from 'openapi-typescript';
import { Ajv2020 } from 'ajv/dist/2020.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const option = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const check = argv.includes('--check');
const subsetOnly = argv.includes('--subset-only');
const schemasDir = option('--schemas') ?? path.join(root, 'contracts/schemas');
const operationsFile = option('--operations') ?? path.join(root, 'contracts/openapi.json');
const against = option('--against') ?? root;
const rel = (...parts) => path.join(root, ...parts);
const sha256 = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const read = (file) => readFileSync(rel(file));
const ID_BASE = 'https://agora.invalid/schemas/';
const SAFE = 9007199254740991;
const OUTPUTS = {
	bundle: 'contracts/generated/openapi.bundled.json',
	typescript: 'contracts/generated/typescript/openapi.d.ts',
	manifest: 'contracts/generated/manifest.json',
};
// swift-openapi-generator decides its own file split; every file it writes here is a tracked output.
const SWIFT_DIR = 'contracts/swift/Sources/AgoraContracts/Generated';

class ContractError extends Error {
	constructor(message, exit = 1) {
		super(message);
		this.exit = exit;
	}
}

// One file per family; every component is a `$defs` entry. `$ref` targets are `#/$defs/Name` in the same
// file or `<file>#/$defs/Name` across files, resolved against the fixed `$id` base and nothing else.
function loadFamilies() {
	const files = readdirSync(schemasDir).filter((f) => f.endsWith('.schema.json')).sort();
	const families = files.map((file) => ({ file, document: JSON.parse(readFileSync(path.join(schemasDir, file), 'utf8')) }));
	const components = new Map();
	for (const { file, document } of families) {
		const keys = Object.keys(document).sort().join(',');
		if (keys !== '$defs,$id,$schema,description,title') throw new ContractError(`${file}: root keys must be exactly $schema, $id, title, description, $defs; found ${keys}`);
		if (document.$schema !== 'https://json-schema.org/draft/2020-12/schema') throw new ContractError(`${file}: $schema must be JSON Schema 2020-12`);
		if (document.$id !== `${ID_BASE}${file}`) throw new ContractError(`${file}: $id must be ${ID_BASE}${file}`);
		for (const [name, schema] of Object.entries(document.$defs)) {
			if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) throw new ContractError(`${file}: component ${name} must be PascalCase`);
			if (components.has(name)) throw new ContractError(`${file}: component ${name} also defined in ${components.get(name).file}`);
			components.set(name, { file, schema });
		}
	}
	const known = new Set(families.map((f) => f.file));
	const resolve = (ref, file) => {
		const match = /^(?:([a-z-]+\.schema\.json))?#\/\$defs\/([A-Za-z0-9]+)$/.exec(ref);
		if (!match) throw new ContractError(`${file}: unsupported $ref ${ref}`);
		const [, target = file, name] = match;
		if (!known.has(target)) throw new ContractError(`${file}: $ref to unknown family ${target}`);
		if (!components.has(name) || components.get(name).file !== target) throw new ContractError(`${file}: $ref to unknown component ${ref}`);
		return `#/components/schemas/${name}`;
	};
	const schemas = {};
	for (const name of [...components.keys()].sort()) {
		const { file, schema } = components.get(name);
		schemas[name] = rewrite(schema, file, resolve);
		checkSubset(schemas[name], `${file}#/$defs/${name}`);
	}
	return { families, schemas };
}

function rewrite(node, file, resolve) {
	if (Array.isArray(node)) return node.map((item) => rewrite(item, file, resolve));
	if (node && typeof node === 'object') {
		return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, key === '$ref' ? resolve(value, file) : rewrite(value, file, resolve)]));
	}
	return node;
}

// The tested common subset. Anything else blocks the contract instead of degrading to an unconstrained type.
const ALLOWED = {
	string: ['enum', 'pattern', 'minLength', 'maxLength'],
	integer: ['enum', 'minimum', 'maximum'],
	boolean: [],
	object: ['properties', 'required', 'additionalProperties'],
	array: ['items', 'minItems', 'maxItems'],
};
function checkSubset(schema, at) {
	const fail = (why) => { throw new ContractError(`${at}: ${why}`); };
	if (!schema || typeof schema !== 'object' || Array.isArray(schema)) fail('schema must be an object');
	const keys = Object.keys(schema).filter((k) => k !== 'description' && k !== '$comment');
	if ('$ref' in schema) {
		if (keys.length !== 1) fail('$ref must stand alone');
		return;
	}
	if (typeof schema.type !== 'string' || !(schema.type in ALLOWED)) fail(`type must be one of ${Object.keys(ALLOWED).join(', ')}; null, number and type arrays are outside the subset`);
	for (const key of keys) if (key !== 'type' && !ALLOWED[schema.type].includes(key)) fail(`keyword ${key} is outside the subset for type ${schema.type}`);
	if ('enum' in schema) {
		if (!Array.isArray(schema.enum) || schema.enum.length === 0) fail('enum must be a non-empty array');
		if (new Set(schema.enum).size !== schema.enum.length) fail('enum has duplicates');
		for (const value of schema.enum) {
			if (schema.type === 'string' && typeof value !== 'string') fail('string enum with a non-string value');
			if (schema.type === 'integer' && !(Number.isSafeInteger(value))) fail('integer enum with a non-safe-integer value');
		}
	}
	if (schema.type === 'integer' && !('enum' in schema)) {
		if (!Number.isSafeInteger(schema.minimum) || !Number.isSafeInteger(schema.maximum)) fail(`integer needs safe minimum and maximum within ±${SAFE}`);
		if (schema.minimum > schema.maximum) fail('minimum above maximum');
	}
	if ('pattern' in schema) checkPattern(schema.pattern, fail);
	if (schema.type === 'object') {
		if (schema.additionalProperties !== false) fail('objects must declare additionalProperties: false');
		if (!schema.properties || typeof schema.properties !== 'object') fail('objects must declare properties');
		const names = Object.keys(schema.properties);
		for (const name of names) {
			if (!/^[a-z][a-z0-9_]*$/.test(name)) fail(`property ${name} must be ASCII snake_case`);
			checkSubset(schema.properties[name], `${at}/${name}`);
		}
		for (const name of schema.required ?? []) if (!names.includes(name)) fail(`required ${name} is not a property`);
	}
	if (schema.type === 'array') {
		if (!schema.items) fail('arrays must declare items');
		checkSubset(schema.items, `${at}/items`);
	}
}

// Patterns stay inside the grammar JavaScript (u flag) and ICU evaluate identically: anchors, literal
// ASCII, groups, alternation, ?, {m,n}, character classes of ASCII ranges. No shorthand classes such as
// \d (ICU matches non-ASCII digits), no unescaped dot, no lookaround, no backreferences.
function checkPattern(pattern, fail) {
	if (typeof pattern !== 'string' || !pattern.startsWith('^') || !pattern.endsWith('$')) fail('pattern must be anchored with ^ and $');
	let inClass = false;
	for (let i = 0; i < pattern.length; i++) {
		const ch = pattern[i];
		if (ch === '\\') {
			const next = pattern[++i];
			if (!['.', '-', '+', '/'].includes(next)) fail(`pattern escape \\${next} is outside the subset`);
			continue;
		}
		if (inClass) {
			if (ch === ']') inClass = false;
			else if (!/[A-Za-z0-9\-.+/:_]/.test(ch)) fail(`pattern class character ${ch} is outside the subset`);
			continue;
		}
		if (ch === '[') inClass = true;
		else if (ch === '(' && pattern[i + 1] === '?') fail('pattern groups must be capturing; lookaround and flags are outside the subset');
		else if (ch === '.') fail('unescaped dot is outside the subset');
		else if (!/[A-Za-z0-9^$()|?{},\-:/+_]/.test(ch)) fail(`pattern character ${ch} is outside the subset`);
	}
	if (inClass) fail('unterminated character class');
	new RegExp(pattern, 'u');
}

function bundle(families, schemas) {
	const operations = JSON.parse(readFileSync(operationsFile, 'utf8'));
	if (operations.openapi !== '3.1.1') throw new ContractError('contracts/openapi.json: openapi must be 3.1.1');
	if (Object.keys(operations.components?.schemas ?? {}).length) throw new ContractError('contracts/openapi.json: components.schemas is generated from contracts/schemas, not authored');
	const refs = [];
	(function walk(node, at) {
		if (Array.isArray(node)) return node.forEach((item, i) => walk(item, `${at}[${i}]`));
		if (!node || typeof node !== 'object') return;
		for (const [key, value] of Object.entries(node)) {
			if (key === 'schema') {
				if (Object.keys(value).length !== 1 || typeof value.$ref !== 'string') throw new ContractError(`${at}.schema: operations reference components; inline schemas are not authored here`);
				refs.push(value.$ref);
			} else walk(value, `${at}.${key}`);
		}
	})(operations.paths, 'paths');
	for (const ref of refs) if (!schemas[ref.replace('#/components/schemas/', '')] || !ref.startsWith('#/components/schemas/')) throw new ContractError(`contracts/openapi.json: ${ref} is not a published component`);
	const document = { ...operations, components: { schemas } };
	const ajv = new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false, validateFormats: true, loadSchema: () => Promise.reject(new Error('remote schema resolution is disabled')) });
	for (const { file, document: family } of families) {
		try { ajv.addSchema(family); } catch (error) { throw new ContractError(`${file}: ${error.message}`); }
	}
	for (const name of Object.keys(schemas)) ajv.compile({ $ref: `${ID_BASE}${families.find((f) => name in f.document.$defs).file}#/$defs/${name}` });
	return document;
}

async function generateTypeScript(bundlePath) {
	const ast = await openapiTS(pathToFileURL(bundlePath));
	const header = '// Generated by contracts/tools/generate.mjs from contracts/openapi.json and contracts/schemas/*.schema.json with openapi-typescript 7.13.0. Do not edit; regenerate.\n';
	return `${header}${astToString(ast)}`;
}

function generateSwift(bundlePath, outDir) {
	const which = spawnSync('swift', ['--version'], { encoding: 'utf8' });
	if (which.error || which.status !== 0) throw new ContractError('swift toolchain unavailable; Swift generation is mandatory evidence, not optional', 3);
	const args = ['run', '--package-path', rel('contracts/swift'), 'swift-openapi-generator', 'generate', bundlePath, '--config', rel('contracts/swift/openapi-generator-config.yaml'), '--output-directory', outDir];
	const run = spawnSync('swift', args, { encoding: 'utf8', env: { ...process.env, SWIFTPM_ENABLE_SANDBOX: '0' } });
	if (run.status !== 0) throw new ContractError(`swift-openapi-generator failed: ${run.stderr || run.stdout}`, 70);
}

function pinnedGeneratorVersion() {
	const resolved = JSON.parse(read('contracts/swift/Package.resolved').toString('utf8'));
	return resolved.pins.find((p) => p.identity === 'swift-openapi-generator')?.state.version ?? 'unpinned';
}

async function generateInto(base) {
	const { families, schemas } = loadFamilies();
	const document = bundle(families, schemas);
	const write = (key, content) => {
		const file = path.join(base, OUTPUTS[key]);
		mkdirSync(path.dirname(file), { recursive: true });
		writeFileSync(file, content);
	};
	write('bundle', `${JSON.stringify(document, null, '\t')}\n`);
	write('typescript', await generateTypeScript(path.join(base, OUTPUTS.bundle)));
	const swiftDir = path.join(base, SWIFT_DIR);
	mkdirSync(swiftDir, { recursive: true });
	generateSwift(path.join(base, OUTPUTS.bundle), swiftDir);
	const swiftFiles = readdirSync(swiftDir).filter((f) => f.endsWith('.swift')).sort().map((f) => `${SWIFT_DIR}/${f}`);
	if (!swiftFiles.some((f) => f.endsWith('/Types+Components+Schemas.swift')) || !swiftFiles.some((f) => f.endsWith('/Client.swift'))) throw new ContractError('swift-openapi-generator did not write the schema types and client', 70);
	const outputs = [OUTPUTS.bundle, OUTPUTS.typescript, ...swiftFiles].map((file) => ({ file, digest: sha256(readFileSync(path.join(base, file))) }));
	const manifest = {
		schema_version: 'agora.contract-generation/v1',
		sources: [{ file: 'contracts/openapi.json', digest: sha256(readFileSync(operationsFile)) }, ...families.map((f) => ({ file: `contracts/schemas/${f.file}`, digest: sha256(readFileSync(path.join(schemasDir, f.file))) }))],
		components: Object.keys(schemas),
		tools: { 'openapi-typescript': '7.13.0', 'swift-openapi-generator': pinnedGeneratorVersion() },
		outputs,
	};
	write('manifest', `${JSON.stringify(manifest, null, '\t')}\n`);
	return manifest;
}

function report(outcome, exit, extra) {
	console.log(JSON.stringify({ schema_version: 'agora.contract-generation-run/v1', mode: subsetOnly ? 'subset-only' : check ? 'check' : 'generate', outcome, exit, ...extra }));
	process.exit(exit);
}

try {
	if (subsetOnly) {
		const { families, schemas } = loadFamilies();
		bundle(families, schemas);
		report('pass', 0, { components: Object.keys(schemas) });
	} else if (!check) {
		const manifest = await generateInto(root);
		report('pass', 0, { outputs: manifest.outputs });
	} else {
		const temp = mkdtempSync(path.join(os.tmpdir(), 'agora-contracts-check-'));
		let verdict;
		try {
			const manifest = await generateInto(temp);
			const drift = [];
			const tracked = [...manifest.outputs.map((o) => o.file), OUTPUTS.manifest];
			for (const file of tracked) {
				const expected = sha256(readFileSync(path.join(temp, file)));
				const observed = existsSync(path.join(against, file)) ? sha256(readFileSync(path.join(against, file))) : 'missing';
				if (expected !== observed) drift.push({ file, expected, observed });
			}
			for (const dir of ['contracts/generated', 'contracts/generated/typescript', SWIFT_DIR]) {
				for (const entry of existsSync(path.join(against, dir)) ? readdirSync(path.join(against, dir), { withFileTypes: true }) : []) {
					const file = path.join(dir, entry.name);
					if (entry.isFile() && !tracked.includes(file)) drift.push({ file, expected: 'absent', observed: sha256(readFileSync(path.join(against, file))) });
				}
			}
			verdict = drift.length ? ['fail', 1, { drift, reason_code: 'generated_drift' }] : ['pass', 0, { outputs: manifest.outputs, drift: [] }];
		} finally {
			// report() exits the process, so the temporary tree is removed here, before any exit path.
			rmSync(temp, { recursive: true, force: true });
		}
		report(...verdict);
	}
} catch (error) {
	const exit = error instanceof ContractError ? error.exit : 70;
	report(exit === 3 ? 'unavailable' : exit === 70 ? 'infrastructure_failure' : 'fail', exit, { message: error.message });
}
