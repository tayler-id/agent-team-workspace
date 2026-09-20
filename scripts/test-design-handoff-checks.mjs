import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const packet = 'docs/design-handoff';
const workspace = path.join(root, '.scratch', 'design-handoff-tests');
fs.mkdirSync(workspace, { recursive: true });
const runRoot = fs.mkdtempSync(path.join(workspace, 'run-'));
const change = (file, mutate) => ({ file: path.join(packet, file), mutate });
const manifest = mutate => ({ file: path.join(packet, 'manifest.json'), mutate });
const filler = count => Array.from({ length: count }, (_, i) => `filler line ${i}`).join('\n');
const cases = [
	{ name: 'baseline', changes: [], expected: 0 },
	{ name: 'missing-required-section', changes: [change('workflows.md', t => t.replace(/^## Revocation$/m, '## Removal'))], reason: 'workflows.md: missing required section "Revocation"' },
	{ name: 'missing-readme-part-link', changes: [change('README.md', t => t.replace('(content-design.md)', '(content.md)'))], reason: 'missing link content.md' },
	{ name: 'broken-relative-link', changes: [change('source-map.md', t => `${t}\n[Absent](../absent-spec.md)\n`)], reason: 'missing link ../absent-spec.md' },
	{ name: 'missing-anchor', changes: [change('source-map.md', t => `${t}\n[Absent anchor](../technical-spec.md#r99-absent)\n`)], reason: 'missing anchor' },
	{ name: 'link-escapes-project', changes: [change('source-map.md', t => `${t}\n[Escape](../../../outside.md)\n`)], reason: 'link escapes project' },
	{ name: 'missing-mermaid-diagram', changes: [change('visual-maps.md', t => t.replace('```mermaid\nstateDiagram-v2', '```text\nstateDiagram-v2'))], reason: 'visual-maps.md: missing Mermaid diagram' },
	{ name: 'unknown-mermaid-type', changes: [change('visual-maps.md', t => t.replace('```mermaid\nflowchart', '```mermaid\nmindmap'))], reason: 'unknown Mermaid diagram type' },
	{ name: 'unknown-stage-label', changes: [change('screens.md', t => t.replace('| S1 prototype |', '| Soon |'))], reason: 'screens.md: unknown stage label "Soon"' },
	{ name: 'unknown-status-label', changes: [change('product-brief.md', t => t.replace('| Built |', '| Shipped |'))], reason: 'product-brief.md: unknown status label "Shipped"' },
	{ name: 'private-path', changes: [change('source-map.md', t => `${t}\nSee /Users/someone/.local/share/notes.md\n`)], reason: 'private operational path' },
	{ name: 'long-dash', changes: [change('product-brief.md', t => `${t}\n${String.fromCodePoint(0x2014)}\n`)], reason: 'long dash' },
	{ name: 'placeholder', changes: [change('components.md', t => `${t}\nTBD\n`)], reason: 'unresolved placeholder' },
	{ name: 'unclosed-fence', changes: [change('content-design.md', t => `${t}\n\`\`\`text\n`)], reason: 'unclosed fence' },
	{ name: 'skipped-heading-level', changes: [change('product-brief.md', t => `${t}\n#### Deep\n`)], reason: 'skipped heading level' },
	{ name: 'packet-over-line-limit', changes: [change('content-design.md', t => `${t}\n${filler(1001)}\n`)], reason: 'packet exceeds 1000 meaningful lines' },
	{ name: 'unlisted-packet-file', changes: [{ file: path.join(packet, 'extra.md'), mutate: () => '# Extra\n\nNot in the manifest.\n' }], reason: 'extra.md not listed in manifest.json' },
	{ name: 'manifest-lists-missing-file', changes: [manifest(t => t.replace('"content-design.md"', '"absent.md"'))], reason: 'manifest.json lists missing absent.md' },
	{ name: 'manifest-without-revision', changes: [manifest(t => t.replace(/"source_base_commit": "[0-9a-f]+"/, '"source_base_commit": "unknown"'))], reason: 'manifest.json: source_base_commit must be a commit hash' },
	{ name: 'readme-order-drift', changes: [manifest(t => t.replace('"product-brief.md",\n', '').replace('"source-map.md"', '"source-map.md",\n\t\t"product-brief.md"'))], reason: 'README.md reading order differs from manifest.json' },
];
for (const test of cases) {
	const fixture = path.join(runRoot, test.name);
	fs.mkdirSync(fixture);
	for (const tree of ['docs', 'scripts', 'agora', 'contracts/schemas', 'evidence', '.agents/skills/verify-agora', 'apps/center', 'packages/storage']) fs.cpSync(path.join(root, tree), path.join(fixture, tree), { recursive: true, filter: source => !source.includes('node_modules') });
	for (const file of ['AGENTS.md', 'contracts/openapi.json', 'package.json']) fs.copyFileSync(path.join(root, file), path.join(fixture, file));
	for (const { file, mutate } of test.changes) {
		const target = path.join(fixture, file);
		const before = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
		const after = mutate(before);
		assert.notEqual(before, after, `${test.name}: mutation did not apply to ${file}`);
		fs.writeFileSync(target, after);
	}
	const result = spawnSync(process.execPath, [path.join(root, 'scripts/verify-design-handoff.mjs')], { cwd: fixture, encoding: 'utf8' });
	assert.equal(result.error, undefined);
	assert.equal(result.status, test.expected ?? 1, `${test.name}: unexpected exit\n${result.stdout}\n${result.stderr}`);
	if (test.reason) assert(result.stderr.includes(test.reason), `${test.name}: rejected for wrong reason\n${result.stderr}`);
	console.log(`PASS ${test.expected === 0 ? 'accepts' : 'rejects'} ${test.name}`);
}
fs.rmSync(runRoot, { recursive: true, force: true });
console.log(`PASS ${cases.length} behavioral design-handoff check cases; no application acceptance implied`);
