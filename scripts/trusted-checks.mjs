// U01b.B03 trusted-check harness. Only `policy` is implemented; every evaluation is unavailable.
// Usage: node scripts/trusted-checks.mjs policy|evaluate [--policy FILE] [--project ID] [--kind KIND] [--input FILE]
import { readFileSync } from 'node:fs';

const exits = { pass: 0, fail: 1, blocked: 2, unavailable: 3, usage_error: 64 };
const [command, ...rest] = process.argv.slice(2).filter(arg => arg !== '--json');
const options = {};
let usage = false;
for (let i = 0; i < rest.length; i += 2) {
	if (!['--policy', '--project', '--kind', '--input'].includes(rest[i]) || !rest[i + 1] || options[rest[i]]) usage = true;
	options[rest[i]] = rest[i + 1];
}
const report = { schema_version: 'agora.trusted-checks-report/v1', command: command ?? null, project: options['--project'] ?? 'agora', outcome: 'pass', denials: [] };
try {
	if (usage || !['policy', 'evaluate'].includes(command)) throw Object.assign(new Error('usage_error'), { outcome: 'usage_error' });
	const policy = JSON.parse(readFileSync(options['--policy'] ?? 'agora/trusted-checks.json', 'utf8'));
	const project = policy.projects?.[report.project];
	if (policy.schema_version !== 'agora.trusted-checks/v1' || !project) throw Object.assign(new Error('policy_invalid'), { outcome: 'blocked' });
	if (command === 'policy') report.policy = project;
	else throw Object.assign(new Error('evaluation_unavailable'), { outcome: 'unavailable' });
} catch (error) {
	report.outcome = error.outcome ?? 'blocked';
	report.denials = [error.message];
}
console.log(JSON.stringify(report, null, 2));
process.exitCode = exits[report.outcome];
