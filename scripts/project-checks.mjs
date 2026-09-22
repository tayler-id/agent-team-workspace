// Local fixture freshness and ownership checks, not U01b.B02's signed general evidence validator.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createWireValidator } from '../contracts/src/index.ts';
export const wire = createWireValidator();
export const exits = { pass: 0, fail: 1, blocked: 2, unavailable: 3, usage_error: 64, infrastructure_failure: 70 };
export const hash = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
export const json = file => JSON.parse(readFileSync(file, 'utf8'));
export function writeState(file, value) {
	const pending = `${file}.${process.pid}.pending`;
	writeFileSync(pending, JSON.stringify(value), { mode: 0o600 }); renameSync(pending, file);
}
export function requireThat(ok, reason, outcome = 'fail') { if (!ok) throw Object.assign(new Error(reason), { outcome }); }
export function command(argv, cwd = process.cwd()) {
	return spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', timeout: 300_000, maxBuffer: 8 * 1024 * 1024, env: environment() });
}
export function environment() {
	// Allowlist, not removal of a few known credential names. No inherited DB URLs or Node hooks.
	return Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG', 'AGORA_PG_BIN'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
}
export function safe(file) {
	const target = path.resolve(file);
	requireThat(['.scratch', 'evidence'].some(root => target.startsWith(path.resolve(root) + path.sep)), 'unsafe_path');
	let ancestor = target;
	while (!existsSync(ancestor)) { requireThat(!lstatSync(ancestor, { throwIfNoEntry: false })?.isSymbolicLink(), 'unsafe_path'); ancestor = path.dirname(ancestor); }
	requireThat(realpathSync(ancestor) === ancestor, 'unsafe_path'); return target;
}
export function versions() {
	const files = command(['git', 'ls-files', '-co', '--exclude-standard']).stdout.trim().split('\n').filter(file => /^(scripts|packages|apps|contracts|agora)\//.test(file) || ['package.json', 'pnpm-lock.yaml', '.agents/skills/verify-agora/SKILL.md'].includes(file));
	const digest = hash([...new Set(files)].sort().map(file => `${file}:${existsSync(file) ? hash(readFileSync(file)) : 'missing'}`).join('\n'));
	return { code: command(['git', 'rev-parse', 'HEAD']).stdout.trim(), config: digest, fixture: hash(readFileSync('agora/project.json')) };
}
export function mapped() {
	const manifest = json('agora/project.json'); const features = json('agora/feature-map.json').features;
	requireThat(wire.validate('ProjectFixtureConfig', manifest).ok, 'manifest_invalid');
	requireThat(manifest.commands.map(entry => entry.command).join(',') === 'doctor,scenarios,start,verify,evidence,stop,lanes' && manifest.commands.every(entry => JSON.stringify(entry.agora) === JSON.stringify(['node','scripts/project.mjs','project',entry.command]) && JSON.stringify(entry.python) === JSON.stringify(['python3','packages/verification/fixture/project.py',entry.command])), 'command_drift');
	const baseline = JSON.parse(command(['git', 'show', '421f572:agora/feature-map.json']).stdout).features;
	requireThat(new Set(features.map(feature => feature.id)).size === features.length && baseline.every(old => features.some(feature => feature.id === old.id && old.scenarios.every(id => feature.scenarios.includes(id)))), 'feature_map_drift');
	const entry = features.find(feature => feature.id === 'project-controls');
	requireThat(entry?.last_verified_subject?.requires_live_pass === true && ['policy', 'packages/verification/test/project.test.ts'].every(id => entry.scenarios.includes(id)), 'feature_map_drift');
	requireThat(['scripts/project.mjs', 'scripts/project-host.mjs', 'scripts/project-checks.mjs', 'apps/center/src/verification.mjs', 'packages/verification/fixture', 'agora/project.json', '.agents/skills/verify-agora/SKILL.md'].every(file => entry.paths.includes(file)), 'feature_map_drift');
	requireThat(manifest.scenarios.join(',') === 'policy,controls,guards' && manifest.lanes.map(row => row.id).join(',') === '1,2,3,4', 'scenario_drift');
	return manifest;
}
export function validateReport(report, exit) {
	requireThat(wire.validate('CliReport', report).ok && exits[report.outcome] === exit, 'report_invalid'); return report;
}
export function checkEvidence(report, current) {
	validateReport(report, 0);
	requireThat(report.command === 'verify' && report.scenario_id === 'policy' && report.run_id === current.id && report.instance?.cleanup_handle === current.handle && report.instance.root === current.root && JSON.stringify(report.versions) === JSON.stringify(versions()), 'stale_evidence');
	requireThat(report.artifacts.length > 0, 'missing_artifacts');
	for (const artifact of report.artifacts) {
		const file = safe(artifact.path);
		requireThat(existsSync(file) && lstatSync(file).isFile(), 'missing_artifact');
		const bytes = readFileSync(file); requireThat(bytes.length === artifact.byte_length && hash(bytes) === artifact.digest, 'artifact_mismatch');
	}
	return report.artifacts;
}
export function artifact(file) {
	const bytes = readFileSync(safe(file)); return { path: path.relative(process.cwd(), file), digest: hash(bytes), byte_length: bytes.length, media_type: 'application/json' };
}
