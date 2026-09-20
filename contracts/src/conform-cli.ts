// Runs the golden contract vectors through the TypeScript consumer and the Swift conformance consumer and
// compares them. Usage: node contracts/src/conform-cli.ts [--json]
// Exit codes follow R12: 0 pass, 1 observed disagreement, 3 unavailable Swift toolchain, 70 infrastructure failure.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareConsumers, type ConsumerReport, runTypeScriptConsumer, type VectorFile } from './conformance.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const vectorsPath = path.join(root, 'contracts/fixtures/vectors.json');
const bundlePath = path.join(root, 'contracts/generated/openapi.bundled.json');

export interface SwiftRun {
	outcome: 'pass' | 'unavailable' | 'infrastructure_failure';
	report?: ConsumerReport;
	message?: string;
}

export function runSwiftConsumer(vectors: string = vectorsPath): SwiftRun {
	const toolchain = spawnSync('swift', ['--version'], { encoding: 'utf8' });
	if (toolchain.error || toolchain.status !== 0) return { outcome: 'unavailable', message: 'swift toolchain unavailable; Swift conformance is mandatory evidence, not optional' };
	const run = spawnSync('swift', ['run', '--package-path', path.join(root, 'contracts/swift'), 'agora-contracts-conform', vectors, bundlePath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
	if (run.status !== 0) return { outcome: 'infrastructure_failure', message: `swift consumer exited ${run.status ?? 'null'}: ${run.stderr.slice(-4000)}` };
	try {
		return { outcome: 'pass', report: JSON.parse(run.stdout) as ConsumerReport };
	} catch (error) {
		return { outcome: 'infrastructure_failure', message: `swift consumer printed no report: ${error instanceof Error ? error.message : String(error)}` };
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const file = JSON.parse(readFileSync(vectorsPath, 'utf8')) as VectorFile;
	const typescript = runTypeScriptConsumer(file);
	const swift = runSwiftConsumer();
	const results = swift.report ? compareConsumers(file, typescript, swift.report) : [];
	const exit = swift.outcome === 'unavailable' ? 3 : swift.outcome === 'infrastructure_failure' ? 70 : results.some((r) => r.outcome === 'fail') ? 1 : 0;
	const outcome = exit === 0 ? 'pass' : exit === 3 ? 'unavailable' : exit === 70 ? 'infrastructure_failure' : 'fail';
	const report = { schema_version: 'agora.contract-conformance-run/v1', outcome, exit, vectors: file.vectors.length, swift: swift.outcome, message: swift.message, results };
	process.stdout.write(`${process.argv.includes('--json') ? JSON.stringify(report) : JSON.stringify(report, null, '\t')}\n`);
	process.exit(exit);
}
