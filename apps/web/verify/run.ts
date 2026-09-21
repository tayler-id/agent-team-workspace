// Project-owned browser verification for the React engineering fixture. Structured assertions only; every
// measurement names its instrument and limit. This is not the U01b runner and does not qualify U01d.
// Usage: pnpm web:verify [--out DIR] [--skip-build] [--headed]
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';

interface Assertion { readonly name: string; readonly expected: string; readonly observed: string; readonly outcome: 'pass' | 'fail' }
interface Scenario { readonly id: string; readonly viewport: string; readonly assertions: Assertion[]; readonly artifacts: string[]; outcome: 'pass' | 'fail' }
const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const option = (name: string): string | undefined => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const out = path.resolve(option('--out') ?? path.join(root, '../../.scratch/web-verify'));
const viewports = [{ width: 390, height: 844 }, { width: 1440, height: 900 }] as const;
const budgets = { bundleBytes: 350 * 1024, replayMs: 2000, inputP95Ms: 100, heapBytes: 200 * 1024 * 1024, heapGrowth: 0.1 };
const limits = [
	'Chromium headless only (Playwright); no Safari, no VoiceOver, no reference laptop, no 10-Mbps shaping.',
	'Fixture room is 14 messages plus synthetic 1,000 missed events and a 5,000-message large room, not the 50,000-message R23 fixture.',
	'Heap is JSHeapUsedSize from the Chrome DevTools Performance domain after HeapProfiler.collectGarbage, over five short reconnect/update cycles, not a ten-minute cycle.',
	'Input latency is input event timestamp to the composer state text mutation inside the page, not OS-level keystroke timing.',
	'Update isolation counts DOM mutations under the message list and per-row commit counters; React profiler commit timings are not collected.',
	'axe-core automated rules only; screen-reader scripts were not executed.',
	'No parent/head interleaved batches: the parent has no React fixture, so only absolute budgets apply.',
];

function serve(dir: string): Promise<{ url: string; close: () => void }> {
	const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
	const server = createServer((request, response) => {
		const file = path.join(dir, new URL(request.url ?? '/', 'http://x').pathname.replace(/\/$/, '/index.html'));
		if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) { response.writeHead(404); response.end(); return; }
		response.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
		createReadStream(file).pipe(response);
	});
	return new Promise((resolve) => { server.listen(0, '127.0.0.1', () => { const address = server.address(); const port = typeof address === 'object' && address ? address.port : 0; resolve({ url: `http://127.0.0.1:${port}/`, close: () => { server.close(); } }); }); });
}

function bundle(): Scenario {
	const assets = path.join(root, 'dist/assets');
	const js = readdirSync(assets).filter((f) => f.endsWith('.js')).map((f) => gzipSync(readFileSync(path.join(assets, f)), { level: 9 }).length);
	const total = js.reduce((a, b) => a + b, 0);
	const assertion: Assertion = { name: 'initial compressed JavaScript', expected: `<= ${budgets.bundleBytes} bytes gzip`, observed: `${total} bytes gzip across ${js.length} file(s)`, outcome: total <= budgets.bundleBytes ? 'pass' : 'fail' };
	return { id: 'bundle', viewport: 'n/a', assertions: [assertion], artifacts: [], outcome: assertion.outcome };
}

const control = (page: Page, label: string) => page.getByRole('button', { name: label, exact: true });
const phase = (page: Page): Promise<string | null> => page.getByRole('status').getAttribute('data-phase');
const check = (scenario: Scenario, name: string, expected: string, observed: string, pass: boolean): void => { scenario.assertions.push({ name, expected, observed, outcome: pass ? 'pass' : 'fail' }); if (!pass) scenario.outcome = 'fail'; };
const shot = async (page: Page, scenario: Scenario, name: string): Promise<void> => { const file = `${scenario.viewport}-${name}.png`; await page.screenshot({ path: path.join(out, file), fullPage: false }); scenario.artifacts.push(file); };

async function drive(browser: Browser, url: string, viewport: { width: number; height: number }, axe: string): Promise<Scenario[]> {
	const label = `${viewport.width}x${viewport.height}`;
	const scenarios: Scenario[] = [];
	const scenario = (id: string): Scenario => { const s: Scenario = { id, viewport: label, assertions: [], artifacts: [], outcome: 'pass' }; scenarios.push(s); return s; };
	const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
	const page = await context.newPage();
	const errors: string[] = [];
	page.on('pageerror', (error) => { errors.push(error.message); });
	page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
	await page.goto(url);

	const states = scenario('states-and-landmarks');
	check(states, 'empty state', 'data-phase empty', String(await phase(page)), (await phase(page)) === 'empty');
	for (const [role, count] of [['banner', 1], ['navigation', 1], ['main', 1], ['contentinfo', 0]] as const) check(states, `${role} landmark`, String(count), String(await page.getByRole(role).count()), (await page.getByRole(role).count()) === count);
	await shot(page, states, 'empty');
	await control(page, 'Load snapshot').click();
	check(states, 'live after snapshot', 'live', String(await phase(page)), (await phase(page)) === 'live');
	check(states, 'timeline rows', '14', String(await page.locator('ol.rows > li').count()), (await page.locator('ol.rows > li').count()) === 14);
	check(states, 'unread boundary', '1 separator', String(await page.getByRole('separator', { name: 'Unread messages start here' }).count()), (await page.getByRole('separator', { name: 'Unread messages start here' }).count()) === 1);
	check(states, 'responsive shell', viewport.width <= 700 ? 'phone' : 'desktop', String(await page.locator('.shell').getAttribute('data-viewport')), (await page.locator('.shell').getAttribute('data-viewport')) === (viewport.width <= 700 ? 'phone' : 'desktop'));
	check(states, 'no horizontal page scroll', 'scrollWidth <= innerWidth', await page.evaluate(() => `${document.documentElement.scrollWidth} <= ${window.innerWidth}`), await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
	await shot(page, states, 'live');
	await control(page, 'Skip one event (gap)').click();
	check(states, 'gap state', 'gap', String(await phase(page)), (await phase(page)) === 'gap');
	await shot(page, states, 'gap');
	await control(page, 'Fill gap').click();
	check(states, 'gap drained', 'live', String(await phase(page)), (await phase(page)) === 'live');
	await control(page, 'Resync').click();
	check(states, 'resync state', 'resync', String(await phase(page)), (await phase(page)) === 'resync');
	await shot(page, states, 'resync');
	await control(page, 'Load fresh snapshot').click();
	check(states, 'resync recovered', 'live with cursor 18', await page.getByRole('status').innerText(), (await page.getByRole('status').innerText()).includes('Cursor 18 applied'));
	await control(page, 'Load invalid snapshot').click();
	check(states, 'error state', 'alert with snapshot rejected', await page.getByRole('alert').innerText(), (await page.getByRole('alert').innerText()).includes('snapshot rejected'));
	await shot(page, states, 'error');
	await control(page, 'Replay next event').click();
	const cursorBefore = await page.getByRole('status').innerText();
	await control(page, 'Duplicate last event').click();
	const requests = await page.locator('[data-last-requests]').getAttribute('data-last-requests');
	check(states, 'duplicate ignored', 'same cursor, no request, no acknowledgement', `${await page.getByRole('status').innerText()} | requests=${requests}`, (await page.getByRole('status').innerText()) === cursorBefore && requests === '' && (await page.locator('dl[aria-label="Last transition"] dd').nth(2).innerText()) === 'none');

	const keyboard = scenario('keyboard-and-focus');
	await page.keyboard.press('Tab');
	check(keyboard, 'first tab stop', 'skip link', await page.evaluate(() => document.activeElement?.textContent ?? ''), (await page.evaluate(() => document.activeElement?.textContent)) === 'Skip to messages');
	let focused = '';
	for (let i = 0; i < 40 && !focused.startsWith('message-'); i++) { await page.keyboard.press('Tab'); focused = await page.evaluate(() => document.activeElement?.id ?? ''); }
	check(keyboard, 'one tab stop reaches the timeline', 'message-* focused', focused, focused.startsWith('message-'));
	await page.keyboard.press('ArrowUp');
	const above = await page.evaluate(() => document.activeElement?.id ?? '');
	check(keyboard, 'arrow moves within groups', 'a different message id', above, above.startsWith('message-') && above !== focused);
	await page.keyboard.press('Home');
	await page.keyboard.press('ArrowDown');
	const trigger = await page.evaluate(() => document.activeElement?.id ?? '');
	await page.keyboard.press('Enter');
	const paneFocus = await page.evaluate(() => `${document.activeElement?.tagName ?? ''}:${document.activeElement?.textContent ?? ''}`);
	check(keyboard, 'Enter opens thread and moves focus to its heading', 'H2:Thread', paneFocus, paneFocus === 'H2:Thread');
	if (viewport.width <= 700) check(keyboard, 'phone pane hides timeline with a back control', 'main hidden, Back visible', `${await page.getByRole('main').count()} main, ${await page.getByRole('button', { name: 'Back to timeline' }).count()} back`, (await page.getByRole('main').count()) === 0 && (await page.getByRole('button', { name: 'Back to timeline' }).count()) === 1);
	await shot(page, keyboard, 'thread');
	await page.keyboard.press('Escape');
	await page.waitForTimeout(50);
	const returned = await page.evaluate(() => document.activeElement?.id ?? '');
	check(keyboard, 'Escape returns focus to the trigger', trigger, returned, returned === trigger);
	check(keyboard, 'reduced motion honored', 'pane transition none', await page.evaluate(() => getComputedStyle(document.querySelector('.pane') ?? document.body).transitionProperty), (await page.evaluate(() => getComputedStyle(document.querySelector('.pane') ?? document.body).transitionDuration)) === '0s');

	const accessibility = scenario('accessibility');
	await page.getByRole('button', { name: 'Runs, tasks and approvals' }).click();
	await page.addScriptTag({ content: axe });
	const findings = await page.evaluate(async () => { const result = await (window as unknown as { axe: { run: (context: Document, options: object) => Promise<{ violations: { id: string; impact: string; nodes: unknown[] }[] }> } }).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }); return result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })); });
	const serious = findings.filter((f) => f.impact === 'critical' || f.impact === 'serious');
	check(accessibility, 'axe critical/serious findings with cards pane open', '0', JSON.stringify(findings), serious.length === 0);
	await shot(page, accessibility, 'cards');
	await page.keyboard.press('Escape');
	check(accessibility, 'page errors', '0', JSON.stringify(errors), errors.length === 0);

	const isolation = scenario('update-isolation');
	if (viewport.width > 700) {
		await page.getByRole('button', { name: 'Runs, tasks and approvals' }).click();
		const before = await page.evaluate(() => { const rows = [...document.querySelectorAll('ol.rows > li')].map((li) => (li as HTMLElement).dataset['commits']); const target = document.querySelector('ol.rows') ?? document.body; let mutations = 0; const observer = new MutationObserver((records) => { mutations += records.length; }); observer.observe(target, { subtree: true, childList: true, attributes: true, characterData: true }); (window as unknown as { __rows: () => number }).__rows = () => mutations; return rows; });
		await control(page, '200 run-only updates').click();
		await page.locator('[data-run-id$="01"]').filter({ hasNot: page.locator('[data-revision="4"]') }).first().waitFor();
		const after = await page.evaluate(() => ({ rows: [...document.querySelectorAll('ol.rows > li')].map((li) => (li as HTMLElement).dataset['commits']), mutations: (window as unknown as { __rows: () => number }).__rows(), card: (document.querySelector<HTMLElement>('[data-run-id$="01"]') ?? document.body).dataset }));
		check(isolation, 'message rows untouched by 200 run-only updates', '0 DOM mutations, equal commit counts', `${after.mutations} mutations; commits ${JSON.stringify(before)} -> ${JSON.stringify(after.rows)}`, after.mutations === 0 && JSON.stringify(before) === JSON.stringify(after.rows));
		check(isolation, 'run card advanced', 'revision 204, commits recorded', `revision ${after.card['revision']}, commits ${after.card['commits']}`, after.card['revision'] === '204');
		await page.keyboard.press('Escape');
	} else check(isolation, 'skipped on phone', 'desktop only (pane and timeline share one route on phone)', 'skipped', true);

	const replay = scenario('replay-and-window');
	const replayMs = await page.evaluate(async () => { const button = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Deliver 1,000 missed events'); const status = document.querySelector('[role=status]'); const started = performance.now(); button?.click(); while (!status?.textContent.includes('Cursor 1022 applied')) await new Promise((r) => requestAnimationFrame(r)); return performance.now() - started; });
	const rendered = await page.evaluate(() => { const ids = [...document.querySelectorAll('[data-message-id]')].map((e) => (e as HTMLElement).dataset['messageId']); return { total: document.querySelector('ol.rows')?.getAttribute('data-total'), shown: ids.length, unique: new Set(ids).size }; });
	check(replay, '1,000 missed events applied', `<= ${budgets.replayMs} ms to cursor 1022`, `${replayMs.toFixed(1)} ms`, replayMs <= budgets.replayMs);
	check(replay, 'no duplicates in the rendered window', 'total 1016, unique rendered ids', JSON.stringify(rendered), rendered.total === '1016' && rendered.shown === rendered.unique && rendered.shown === 50);
	await control(page, 'Load older messages (966 older)').click();
	check(replay, 'Load older messages extends the window and keeps focus', 'showing 100 of 1016, focus on the control', `${await page.locator('ol.rows').getAttribute('aria-label')}; focus=${await page.evaluate(() => document.activeElement?.textContent ?? '')}`, (await page.locator('ol.rows').getAttribute('aria-label')) === 'Messages, showing 100 of 1016' && (await page.evaluate(() => document.activeElement?.textContent.startsWith('Load older messages'))) === true);
	await shot(page, replay, 'replayed');

	const latency = scenario('input-latency');
	await page.evaluate(() => { const box = document.getElementById('composer-text') ?? document.body; const state = document.getElementById('composer-state') ?? document.body; const samples: number[] = []; let pending: number | undefined; box.addEventListener('input', (event) => { pending = event.timeStamp; }); new MutationObserver(() => { if (pending !== undefined) { samples.push(performance.now() - pending); pending = undefined; } }).observe(state, { subtree: true, characterData: true, childList: true }); (window as unknown as { __latency: number[] }).__latency = samples; });
	await page.getByLabel(/Message/).focus();
	await page.keyboard.type('x'.repeat(100));
	const samples = await page.evaluate(() => (window as unknown as { __latency: number[] }).__latency);
	const sorted = [...samples].sort((a, b) => a - b);
	const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? Number.NaN;
	check(latency, 'input to visible draft state p95', `<= ${budgets.inputP95Ms} ms over 100 keystrokes`, `${p95.toFixed(2)} ms p95, ${samples.length} samples, max ${(sorted.at(-1) ?? 0).toFixed(2)} ms`, samples.length === 100 && p95 <= budgets.inputP95Ms);

	const memory = scenario('memory-cycles');
	const session = await context.newCDPSession(page);
	await session.send('Performance.enable');
	await session.send('HeapProfiler.enable');
	const heap = async (): Promise<number> => { await session.send('HeapProfiler.collectGarbage'); const { metrics } = await session.send('Performance.getMetrics'); return metrics.find((m) => m.name === 'JSHeapUsedSize')?.value ?? Number.NaN; };
	const trend: number[] = [];
	for (let cycle = 0; cycle < 5; cycle++) {
		await control(page, 'Revoke access').click();
		await control(page, 'Load snapshot').click();
		await control(page, 'Replay all events').click();
		await control(page, 'Deliver 1,000 missed events').click();
		await control(page, '200 run-only updates').click();
		trend.push(await heap());
	}
	const growth = (trend[4] ?? 0) / (trend[1] ?? 1) - 1;
	check(memory, 'retained heap after five reconnect/update cycles', `<= ${budgets.heapBytes} bytes`, `${trend.map((b) => (b / 1024 / 1024).toFixed(1)).join(', ')} MiB`, (trend[4] ?? Number.POSITIVE_INFINITY) <= budgets.heapBytes);
	check(memory, 'heap growth cycle 2 to cycle 5', `<= ${budgets.heapGrowth * 100}%`, `${(growth * 100).toFixed(1)}%`, growth <= budgets.heapGrowth);
	await control(page, 'Revoke access').click();
	check(memory, 'revoked state clears the composer', 'revoked, textbox disabled', `${await phase(page)}, disabled=${await page.getByLabel(/Message/).isDisabled()}`, (await phase(page)) === 'revoked' && (await page.getByLabel(/Message/).isDisabled()));
	await shot(page, memory, 'revoked');
	await context.close();
	return scenarios;
}

async function main(): Promise<number> {
	mkdirSync(out, { recursive: true });
	if (!args.includes('--skip-build')) {
		const build = spawnSync('pnpm', ['--filter', '@agora/web', 'build'], { cwd: path.join(root, '../..'), encoding: 'utf8' });
		if (build.status !== 0) { process.stdout.write(`${JSON.stringify({ schema_version: 'agora.web-fixture-verify/v1', outcome: 'infrastructure_failure', error: build.stderr })}\n`); return 70; }
	}
	const scenarios: Scenario[] = [bundle()];
	const server = await serve(path.join(root, 'dist'));
	let browser: Browser;
	try { browser = await chromium.launch({ headless: !args.includes('--headed') }); } catch (error) {
		server.close();
		process.stdout.write(`${JSON.stringify({ schema_version: 'agora.web-fixture-verify/v1', outcome: 'unavailable', error: String(error) })}\n`);
		return 3;
	}
	const axe = readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
	try { for (const viewport of viewports) scenarios.push(...await drive(browser, server.url, viewport, axe)); } finally { await browser.close(); server.close(); }
	const report = { schema_version: 'agora.web-fixture-verify/v1', outcome: scenarios.every((s) => s.outcome === 'pass') ? 'pass' : 'fail', unit: 'U01d', task: 'agora-react-engineering-fixture', qualification: 'engineering fixture only; not U01d lane evidence', toolchain: { node: process.version, playwright: '1.63.0', browser: `chromium ${browser.version()}`, axe: '4.13.0' }, budgets, limits, scenarios, out };
	writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, '\t')}\n`);
	process.stdout.write(`${JSON.stringify(report)}\n`);
	return report.outcome === 'pass' ? 0 : 1;
}

main().then((code) => { process.exit(code); }, (error: unknown) => { console.error(error); process.exit(70); });
