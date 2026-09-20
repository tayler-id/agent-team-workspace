import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outputLinks } from '../output-links.mjs';
import { companion, markdown, shell } from '../render.mjs';

test('production links include generated navigation, fragment, stylesheet and nested source views', () => {
	const files = new Map([['index.html', '<a href="source/code.html#value">Source</a><link href="style.css">'], ['source/code.html', '<h2 id="value">Value</h2><a href="../index.html">Back</a>'], ['style.css', 'body {}']]);
	assert.deepEqual(outputLinks(files), []);
	files.delete('style.css');
	assert.match(outputLinks(files).join(), /style.css/);
	files.set('source/code.html', '<h2 id="different">Value</h2>');
	assert.match(outputLinks(files).join(), /#value/);
});
test('renderer escapes HTML and flows, works without a browser script and gives native navigation semantics', () => {
	const md = markdown({}, []);
	const html = md.render('# Hello\n\n```flow\nInput | <script>alert(1)</script>\nResult | Safe text\n```');
	assert.ok(html.includes('&lt;script&gt;'));
	assert.ok(html.includes('<ol>'));
	const page = shell({ id: 'index', title: 'Hello' }, html, { groups: [{ title: 'Use', pages: [{ id: 'index', title: 'Hello' }] }] }, []);
	assert.ok(page.includes('aria-current="page"'));
	assert.ok(page.includes('Skip to content'));
	assert.ok(page.includes('<details class="mobile-nav">'));
	assert.ok(!page.includes('<script'));
});
test('Mermaid mirror carries the same status and relationships as the data owner', () => {
	const a = { date: '2026-09-20', revision: '606cba2', nodes: [{ id: 'a', title: 'Input', availability: 'Planned', why: 'Reason', page: 'index.md' }, { id: 'b', title: 'Output', availability: 'Planned', why: 'Reason', page: 'index.md' }], edges: [['a', 'b', 'Authorized command']], features: [], milestones: [{ id: 'U01a', stage: 'S1', status: 'In progress', outcome: 'Fixture' }] };
	assert.ok(companion(a).includes('a -->|Authorized command| b'));
	assert.ok(companion(a).includes('U01a - In progress'));
});
