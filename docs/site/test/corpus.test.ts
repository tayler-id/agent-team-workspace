import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { build } from '../build.mjs';

const result = build();
const root = path.resolve(import.meta.dirname, '../../../.docs-dist');
const html = file => existsSync(path.join(root, file)) ? readFileSync(path.join(root, file), 'utf8') : '';
test('the same public build driver produces a valid baseline before corpus assertions', () => assert.equal(result.outcome, 'pass'));
test('the complete corpus has 27 pages and both audience tracks', () => {
	assert.equal(result.pages, 27, 'complete audience corpus');
	assert.match(html('ci.html'), /prerequisite diagnosis before tests/);
	assert.match(html('test-first.html'), /FG01.red-required/);
	assert.match(html('test-first.html'), /foundation_fixture/);
	assert.match(html('index.html'), /Use Agora/);
	assert.match(html('index.html'), /Build and operate/);
});
test('the atlas explains all nine system nodes and eight connections', () => {
	assert.equal((html('atlas.html').match(/class="map-node"/g) ?? []).length, 9);
	assert.match(html('atlas.html'), /Same worker protocol in S2/);
	assert.match(html('atlas.html'), /Authorized context, never raw SQL/);
});
test('the committed design packet is readable as linked documentation, not a source-code dump', () => {
	assert.match(html('handoff.html'), /Committed design packet/);
	assert.match(html('source/docs/design-handoff/README.md.html'), /<h1 id="agora-design-handoff">Agora design handoff<\/h1>/);
	assert.match(html('source/docs/design-handoff/README.md.html'), /href="product-brief.md.html"/);
	assert.match(html('source/evidence.html'), /Only individually linked/);
});
test('current commands and planned product availability have separate references', () => {
	assert.match(html('cli.html'), /There is no installed/);
	assert.match(html('cli.html'), /Planned product CLI: unavailable/);
	assert.match(html('cli.html'), /pnpm client:replay/);
	assert.match(html('synchronization.html'), /Built: framework-independent core/);
	assert.match(html('synchronization.html'), /HTTP polling adapter and minimal browser harness/);
	assert.match(html('configuration.html'), /AGORA_TEST_SUPERUSER_DATABASE_URL/);
	assert.match(html('faq.html'), /Why does/);
});
