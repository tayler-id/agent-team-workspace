// Checks the design handoff packet under docs/design-handoff: required sections, relative links, Mermaid
// diagrams, stage/status vocabularies, private paths and the R11-derived size limit. Run from the repository root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const packet = 'docs/design-handoff';
const read = file => fs.readFileSync(file, 'utf8');
const slug = heading => heading.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
const anchors = file => new Set([...read(file).matchAll(/^#{1,6} (.+)$/gm)].map(m => slug(m[1])));
const REQUIRED = {
	'README.md': ['Truth labels', 'Read in this order', 'Design first', 'Deliverables'],
	'product-brief.md': ['Purpose', 'Principles', 'Current stage', 'What is built and what is planned', 'Non-goals'],
	'audiences-and-authority.md': ['Audiences', 'Authority matrix'],
	'information-architecture.md': ['Areas', 'Navigation rail', 'Right pane'],
	'workflows.md': ['Invitation and sign-in', 'Entering a project room', 'Human conversation', 'Asking the center agent', 'Creating and owning a task', 'Launching on a selected machine', 'Following and steering a run', 'Recovering a run', 'Reviewing evidence', 'Approving publication', 'Revocation', 'Project provisioning and cloud execution (S2)'],
	'screens.md': ['Screen inventory', 'First prototype'],
	'interaction-and-state.md': ['Record families', 'Never implied by color or prose alone'],
	'components.md': ['Component inventory', 'Rendering constraints'],
	'visual-theme.md': ['Recommended direction', 'Typography roles', 'Color roles', 'Light and dark strategy', 'Starting tokens versus brand decisions'],
	'accessibility-and-responsive.md': ['Requirements', 'Small-screen collapse'],
	'content-design.md': ['Canonical nouns', 'Status labels', 'Voice and tone', 'Examples'],
	'visual-maps.md': ['System map', 'Information architecture', 'Conversation to work journey', 'Run, evidence and publication lifecycle', 'Memory scopes', 'Release-stage surface map'],
	'design-assignment.md': ['Checklist', 'Unresolved decisions to flag', 'Handing results back'],
	'source-map.md': ['Authoritative sources', 'Research archive'],
};
const MERMAID_TYPES = /^(flowchart|graph|sequenceDiagram|stateDiagram-v2)\b/;
const MAX_LINES = 1000;
const MAX_FILES = 25;

const manifest = JSON.parse(read(path.join(packet, 'manifest.json')));
assert.equal(manifest.schema_version, 'agora.design-handoff/v1', 'manifest.json: schema_version');
assert(/^[0-9a-f]{40}$/.test(manifest.source_base_commit), 'manifest.json: source_base_commit must be a commit hash');
assert(typeof manifest.packet_version === 'string' && manifest.packet_version.length, 'manifest.json: packet_version');
assert.equal(manifest.entry, 'README.md', 'manifest.json: entry must be README.md');
const stageLabels = new Set(manifest.stage_labels);
const statusLabels = new Set(manifest.status_labels);
const listed = manifest.files;
const present = fs.readdirSync(packet).filter(f => f.endsWith('.md')).sort();
for (const file of listed) assert(present.includes(file), `manifest.json lists missing ${file}`);
for (const file of present) assert(listed.includes(file), `${file} not listed in manifest.json`);
assert.equal(new Set(listed).size, listed.length, 'manifest.json: duplicate file');
assert(listed.length <= MAX_FILES, `packet exceeds ${MAX_FILES} files`);
for (const file of Object.keys(REQUIRED)) assert(listed.includes(file), `manifest.json: required file ${file} missing`);

let links = 0;
let diagrams = 0;
let meaningful = 0;
function checkLink(from, target) {
	if (/^(https?:|mailto:)/.test(target)) return;
	const [part, fragment] = target.split('#');
	const file = path.normalize(path.join(path.dirname(from), decodeURIComponent(part || path.basename(from))));
	assert(!file.startsWith('..'), `${from}: link escapes project ${target}`);
	assert(fs.existsSync(file), `${from}: missing link ${target}`);
	if (fragment && file.endsWith('.md')) assert(anchors(file).has(fragment), `${from}: missing anchor ${target}`);
	links++;
}
function checkTables(name, text) {
	const lines = text.split('\n');
	for (let i = 0; i + 1 < lines.length; i++) {
		if (!lines[i].startsWith('|') || !/^\|(\s*-+\s*\|)+\s*$/.test(lines[i + 1])) continue;
		const header = lines[i].split('|').slice(1, -1).map(c => c.trim());
		const columns = header.map((h, index) => (h === 'Stage' ? { index, allowed: stageLabels, kind: 'stage' } : h === 'Status' ? { index, allowed: statusLabels, kind: 'status' } : null)).filter(Boolean);
		if (!columns.length) continue;
		for (let row = i + 2; row < lines.length && lines[row].startsWith('|'); row++) {
			const cells = lines[row].split('|').slice(1, -1).map(c => c.trim());
			for (const column of columns) assert(column.allowed.has(cells[column.index]), `${name}: unknown ${column.kind} label "${cells[column.index]}"`);
		}
	}
}
for (const name of listed) {
	const file = path.join(packet, name);
	const text = read(file);
	assert(!/[–—]/u.test(text), `${name}: long dash`);
	assert(!/\b(TODO|TBD|FIXME|XXX)\b|<placeholder>|\[insert\b/iu.test(text), `${name}: unresolved placeholder`);
	assert(!/\/Users\/|\/home\/[a-z]|\.treehouse\/|\.local\/share\/|\/private\/tmp\/|FIRSTMATE_OP|firstmate/i.test(text), `${name}: private operational path`);
	assert.equal([...text.matchAll(/^# /gm)].length, 1, `${name}: one H1 required`);
	let previous = 0;
	let fence = null;
	let body = [];
	const headings = new Set();
	for (const line of text.split('\n')) {
		if (line.trim()) meaningful++;
		if (line.startsWith('```')) {
			if (fence === null) {
				fence = line.slice(3).trim();
				body = [];
			} else {
				if (fence === 'mermaid') {
					assert(MERMAID_TYPES.test(body[0] || ''), `${name}: unknown Mermaid diagram type "${body[0] || ''}"`);
					diagrams++;
				}
				fence = null;
			}
			continue;
		}
		if (fence !== null) {
			body.push(line);
			continue;
		}
		const match = line.match(/^(#{1,6}) (.+)$/);
		if (match) {
			assert(match[1].length <= previous + 1, `${name}: skipped heading level`);
			previous = match[1].length;
			if (match[1].length === 2) headings.add(match[2]);
		}
	}
	assert.equal(fence, null, `${name}: unclosed fence`);
	for (const heading of REQUIRED[name] || []) assert(headings.has(heading), `${name}: missing required section "${heading}"`);
	for (const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) checkLink(file, m[1]);
	checkTables(name, text);
}
const maps = read(path.join(packet, 'visual-maps.md'));
for (const section of REQUIRED['visual-maps.md']) {
	const bodyText = maps.split(`## ${section}\n`)[1]?.split(/^## /m)[0] || '';
	assert(/```mermaid\n/.test(bodyText), `visual-maps.md: missing Mermaid diagram in "${section}"`);
}
const readme = read(path.join(packet, 'README.md'));
const order = [...readme.matchAll(/^\| \d+ \| \[[^\]]+\]\(([a-z-]+\.md)\) \|/gm)].map(m => m[1]);
assert.deepEqual(['README.md', ...order], listed, 'README.md reading order differs from manifest.json');
assert(meaningful <= MAX_LINES, `packet exceeds ${MAX_LINES} meaningful lines (${meaningful})`);
console.log(`PASS packet structure: ${listed.length} files; ${meaningful} meaningful lines; required sections present`);
console.log(`PASS ${links} relative links and anchors; ${diagrams} Mermaid diagrams; stage/status vocabularies; no private paths, placeholders or long dashes`);
console.log(`SCOPE packet structure only; it cannot verify that prose is true or that any screen exists; base revision ${manifest.source_base_commit.slice(0, 7)}`);
