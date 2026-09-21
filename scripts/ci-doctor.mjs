import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const args = process.argv.slice(2).filter(arg => arg !== '--');
if (args.some(arg => !['--json', '--help'].includes(arg))) process.exit(64);
if (args.includes('--help')) {
	console.log('Usage: node scripts/ci-doctor.mjs [--json]; read-only Node/pnpm/Rolldown prerequisites, not behavioral tests.');
	process.exit(0);
}
const root = fileURLToPath(new URL('../', import.meta.url));
const results = [];
const probe = async (id, remedy, check) => {
	try { results.push({ id, outcome: 'pass', detail: await check() }); }
	catch (error) { results.push({ id, outcome: 'blocked', detail: String(error), remedy }); }
};
const command = (file, argv) => {
	const result = spawnSync(file, argv, { cwd: root, encoding: 'utf8', timeout: 15_000, maxBuffer: 64 * 1024,
		env: { ...process.env, COREPACK_ENABLE_NETWORK: '0', npm_config_manage_package_manager_versions: 'false' } });
	if (result.status !== 0) throw new Error(String(result.error ?? (result.stderr.slice(0, 6000) || `exit ${result.status}`)));
	return result.stdout.trim();
};
await probe('node', 'Use the exact .node-version runtime; do not change the approved pin to match this host.', () => {
	const expected = readFileSync(new URL('../.node-version', import.meta.url), 'utf8').trim();
	if (!/^\d+\.\d+\.\d+$/.test(expected) || process.versions.node !== expected) throw new Error(`Node ${process.versions.node}; required ${expected}`);
	return process.versions.node;
});
await probe('pnpm', 'Select the exact installed packageManager version from package.json; this doctor never installs tools.', () => {
	const pin = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).packageManager;
	if (!/^pnpm@\d+\.\d+\.\d+$/.test(pin)) throw new Error('Unreadable exact pnpm contract');
	const actual = command('pnpm', ['--manage-package-manager-versions=false', '--version']);
	if (`pnpm@${actual}` !== pin) throw new Error(`pnpm ${actual}; required ${pin}`);
	return actual;
});
await probe('rolldown', 'Use a compatible unwrapped Node runtime, then pnpm install --frozen-lockfile with optional dependencies. Keep the lockfile. macOS Team-ID errors require a runtime that permits native addons, not another package.', () => command(process.execPath, ['--input-type=module', '-e', `
try {
 if (process.versions.webcontainer) throw new Error('WebContainer native probe unavailable; no automatic fallback installation');
 await import('vitest/node');
 const native = process.report.getReport().sharedObjects.filter(p => /rolldown-binding.*\\.node$/.test(p));
 if (!native.length) throw new Error('Rolldown native library not loaded (WASM is not native readiness)');
 console.log(native.join('\\n'));
} catch (error) {
 const messages = []; for (let e = error; e; e = e.cause) messages.unshift(e.message);
 console.error(messages.join('\\n')); process.exit(2);
}`]));
const outcome = results.every(result => result.outcome === 'pass') ? 'pass' : 'blocked';
const report = { schema_version: 'agora.ci-doctor/v1', outcome, platform: process.platform, arch: process.arch, exec_path: process.execPath, results };
console.log(args.includes('--json') ? JSON.stringify(report) : results.map(r => `${r.id}: ${r.outcome} - ${r.detail}${r.remedy ? `\nRemedy: ${r.remedy}` : ''}`).join('\n'));
process.exit(outcome === 'pass' ? 0 : 2);
