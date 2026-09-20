// R22 test-only public harness. Lifecycle remains unavailable until its behavioral tests pass.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const command = process.argv[2] === 'project' ? process.argv[3] : process.argv[2];
const digest = `sha256:${createHash('sha256').update('test-only harness').digest('hex')}`;
const pass = command === 'doctor' && process.versions.node.startsWith('24.');
console.log(JSON.stringify({ schema_version: 'agora.cli-report/v1', command, versions: { code: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), config: digest, fixture: digest }, outcome: pass ? 'pass' : 'unavailable', diagnostics: [], artifacts: [], started_at: new Date().toISOString(), finished_at: new Date().toISOString() }));
process.exit(pass ? 0 : 3);
