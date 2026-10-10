import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { command, nativeProbe, nativeRemedy } from './native-probe.ts';

const args = process.argv.slice(2).filter(arg => arg !== '--');
if (args.some(arg => !['--json', '--help'].includes(arg))) process.exit(64);
if (args.includes('--help')) {
	console.log('Usage: node scripts/ci-doctor.mjs [--json]; read-only Node/pnpm/Rolldown prerequisites, not behavioral tests.');
	process.exit(0);
}
const results = [];
const probe = async (id, remedy, check) => {
	try { results.push({ id, outcome: 'pass', detail: await check() }); }
	catch (error) { results.push({ id, outcome: 'blocked', detail: String(error), remedy }); }
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
await probe('rolldown', nativeRemedy, () => nativeProbe());
const outcome = results.every(result => result.outcome === 'pass') ? 'pass' : 'blocked';
const report = { schema_version: 'agora.ci-doctor/v1', outcome, platform: process.platform, arch: process.arch, exec_path: process.execPath, results };
console.log(args.includes('--json') ? JSON.stringify(report) : results.map(r => `${r.id}: ${r.outcome} - ${r.detail}${r.remedy ? `\nRemedy: ${r.remedy}` : ''}`).join('\n'));
process.exit(outcome === 'pass' ? 0 : 2);
