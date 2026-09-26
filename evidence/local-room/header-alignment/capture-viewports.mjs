// Run from the repository root: node evidence/local-room/header-alignment/capture-viewports.mjs <url> <outDir>
// Uses the `playwright` package pulled in transitively via @vitest/browser-playwright; no new dependency added.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const url = process.argv[2];
const outDir = process.argv[3];
const sizes = [
	{ name: 'desktop-1440x900', width: 1440, height: 900 },
	{ name: 'phone-390x844', width: 390, height: 844 },
];

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
	const measured = await page.evaluate(() => ({
		innerWidth: window.innerWidth,
		innerHeight: window.innerHeight,
		viewport: document.querySelector('.shell')?.dataset?.viewport,
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth,
		headerPadding: getComputedStyle(document.querySelector('.room-header')).padding,
		h1FontSize: getComputedStyle(document.querySelector('h1.crumb')).fontSize,
		projectColor: getComputedStyle(document.querySelector('.crumb-project')).color,
		roomColor: getComputedStyle(document.querySelector('.crumb-room')).color,
		agentBadgeText: document.querySelector('[data-agent-state="not_enabled"]')?.textContent,
		lifecycleText: document.querySelector('[data-state]')?.textContent,
	}));
	const disconnectVisible = await page.getByRole('button', { name: 'Disconnect' }).isVisible();
	const sendVisible = await page.getByRole('button', { name: 'Send' }).isVisible();
	await page.screenshot({ path: `${outDir}/${size.name}.png` });
	report.push({ size, measured, disconnectVisible, sendVisible, consoleMessages, noHorizontalOverflow: measured.scrollWidth <= measured.clientWidth });
	await context.close();
}
await browser.close();
writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
