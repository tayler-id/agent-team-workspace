// Run from the repository root: node evidence/local-room/unread-boundary/capture-viewports.mjs <url> <instance> <port> <outDir>
// Uses the `playwright` package pulled in transitively via @vitest/browser-playwright; no new dependency added.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const url = process.argv[2];
const instance = process.argv[3];
const port = process.argv[4];
const outDir = process.argv[5];
const sizes = [
	{ name: 'desktop-1440x900', width: 1440, height: 900 },
	{ name: 'phone-390x844', width: 390, height: 844 },
];

function sendFromElsewhere(body) {
	execFileSync('node', ['scripts/local-room.ts', 'send', '--instance', instance, '--port', port, '--body', body], { stdio: 'pipe' });
}

const browser = await chromium.launch();
const report = [];
for (const size of sizes) {
	const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
	const page = await context.newPage();
	const consoleMessages = [];
	page.on('console', (msg) => { consoleMessages.push(`[${msg.type()}] ${msg.text()}`); });
	page.on('pageerror', (err) => { consoleMessages.push(`[pageerror] ${err.message}`); });
	await page.goto(url, { waitUntil: 'domcontentloaded' });
	await page.waitForSelector('button:has-text("Disconnect")', { timeout: 15000 });
	await page.waitForFunction(() => document.querySelectorAll('[data-unread]').length > 0 || document.querySelector('.empty'), { timeout: 15000 });

	const before = await page.evaluate(() => ({ separators: document.querySelectorAll('[role="separator"]').length }));

	// A real unread transition: this message arrives from outside the browser's own composer (a second
	// principal in the same room), so the poller lands it as unread and the boundary marker must appear.
	sendFromElsewhere(`unread boundary check for ${size.name}`);
	await page.waitForSelector('[role="separator"]', { timeout: 15000 });

	const measured = await page.evaluate(() => {
		const separator = document.querySelector('[role="separator"]');
		const chip = separator?.querySelector('.chip');
		const rule = separator?.querySelector('i');
		return {
			innerWidth: window.innerWidth,
			innerHeight: window.innerHeight,
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth,
			unreadHeaderText: document.querySelector('[data-unread]')?.textContent,
			separatorAccessibleName: separator?.getAttribute('aria-label'),
			chipText: chip?.textContent,
			dotBackground: chip ? getComputedStyle(chip.querySelector('.dot')).backgroundColor : undefined,
			ruleHeight: rule ? getComputedStyle(rule).height : undefined,
			ruleBackground: rule ? getComputedStyle(rule).backgroundColor : undefined,
		};
	});
	await page.screenshot({ path: `${outDir}/${size.name}.png` });

	// Mark as read: the boundary must clear, proving it tracks the real unread cursor rather than a static label.
	await page.getByRole('button', { name: 'Mark room as read' }).click();
	await page.waitForFunction(() => document.querySelectorAll('[role="separator"]').length === 0, { timeout: 15000 });
	const afterMarkRead = await page.evaluate(() => ({ separators: document.querySelectorAll('[role="separator"]').length, unreadHeaderText: document.querySelector('[data-unread]')?.textContent }));

	report.push({ size, before, measured, afterMarkRead, noHorizontalOverflow: measured.scrollWidth <= measured.clientWidth, consoleMessages });
	await context.close();
}
await browser.close();
writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
