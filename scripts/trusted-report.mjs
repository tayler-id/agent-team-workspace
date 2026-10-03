// U01b.B03 trusted reporter harness. Only the enrollment prerequisite is checked; reporting is unavailable.
// Usage: node scripts/trusted-report.mjs --run-id ID [--policy FILE] [--project ID] [--api URL] --json
import { readFileSync } from 'node:fs';

const exits = { pass: 0, fail: 1, blocked: 2, unavailable: 3, usage_error: 64 };
const args = process.argv.slice(2).filter(arg => arg !== '--json');
const options = {};
let usage = false;
for (let i = 0; i < args.length; i += 2) {
	if (!['--run-id', '--policy', '--project', '--api'].includes(args[i]) || !args[i + 1] || options[args[i]]) usage = true;
	options[args[i]] = args[i + 1];
}
const report = { schema_version: 'agora.trusted-report/v1', project: options['--project'] ?? 'agora', run_id: Number(options['--run-id']), outcome: 'unavailable', denials: ['reporting_unavailable'], checks: [] };
const project = usage ? undefined : JSON.parse(readFileSync(options['--policy'] ?? 'agora/trusted-checks.json', 'utf8')).projects?.[report.project];
if (usage || !Number.isInteger(report.run_id) || report.run_id < 1) Object.assign(report, { outcome: 'usage_error', denials: ['usage_error'] });
else if (!project?.repository) Object.assign(report, { outcome: 'blocked', denials: ['repository_unprovisioned'] });
else if (!Number.isInteger(project.reporter.app_id) || typeof project.reporter.public_key !== 'string') Object.assign(report, { outcome: 'blocked', denials: ['reporting_app_unenrolled'] });
console.log(JSON.stringify(report, null, 2));
process.exitCode = exits[report.outcome];
