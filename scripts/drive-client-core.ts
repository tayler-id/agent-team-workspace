// Public fixture driver. Replay JSON is test input, not a second wire contract or production API.
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import { initialState, synchronize, type ClientState, type Transition } from '@agora/client-core';
import { fixtureEvent, fixtureSnapshot } from './client-fixture.ts';
import { runSwiftConsumer } from '../contracts/src/conform-cli.ts';
export interface ReplayVector { id: string; snapshot: unknown; events: unknown[]; expected: ClientState }
export interface ReplayFile { schema_version: string; vectors: never[]; replays: ReplayVector[] }
export function replay(vector: ReplayVector): { id: string; outcome: 'pass' | 'fail'; state: ClientState; transcript: Transition[] } {
	const snapshot = fixtureSnapshot(vector.snapshot);
	if (!snapshot) return { id: vector.id, outcome: 'fail', state: initialState(), transcript: [] };
	const transcript = [synchronize(initialState(), snapshot)];
	let state = transcript[0]?.state ?? initialState();
	for (const event of vector.events) {
		const result = synchronize(state, fixtureEvent(snapshot.streamId, event));
		transcript.push(result);
		state = result.state;
	}
	return { id: vector.id, outcome: isDeepStrictEqual(state, vector.expected) ? 'pass' : 'fail', state, transcript };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	function usage(message: string): never { process.stderr.write(`${message}\nusage: pnpm client:replay [--file fixture.json] [--json] [--swift]\n`); process.exit(64); }
	let vectorFile = 'contracts/fixtures/replay.json';
	let useSwift = false;
	const args = process.argv.slice(2);
	if (args[0] === '--') args.shift();
	while (args.length) {
		const flag = args.shift();
		if (flag === '--json') continue;
		if (flag === '--swift') { useSwift = true; continue; }
		if (flag !== '--file') usage('unsupported argument');
		const value = args.shift();
		if (!value || value.startsWith('--')) usage('--file requires a path');
		vectorFile = value;
	}
	let parsed: unknown;
	try { parsed = JSON.parse(readFileSync(vectorFile, 'utf8')); } catch { usage('unreadable or malformed fixture'); }
	if (!parsed || typeof parsed !== 'object' || !('schema_version' in parsed) || parsed.schema_version !== 'agora.contract-vectors/v1' || !('replays' in parsed) || !Array.isArray(parsed.replays) || parsed.replays.length === 0) usage('invalid fixture vector file');
	const rows: unknown[] = parsed.replays;
	if (rows.some((r) => !r || typeof r !== 'object' || !('id' in r) || typeof r.id !== 'string' || !('snapshot' in r) || !('expected' in r) || !('events' in r) || !Array.isArray(r.events))) usage('invalid replay row');
	const file = parsed as ReplayFile;
	const started = performance.now();
	const results = file.replays.map(replay);
	const swift = useSwift ? runSwiftConsumer(vectorFile) : undefined;
	const native = swift?.report as { replays?: { id: string; outcome: string; state: unknown }[] } | undefined;
	const expected = file.replays.map((v) => ({ id: v.id, outcome: 'pass', state: v.expected }));
	const agrees = !useSwift || isDeepStrictEqual(native?.replays, expected);
	const outcome = swift && swift.outcome !== 'pass' ? swift.outcome : results.every((r) => r.outcome === 'pass') && agrees ? 'pass' : 'fail';
	process.stdout.write(`${JSON.stringify({ outcome, fixture: vectorFile, runtime: process.version, elapsed_ms: performance.now() - started, results, swift })}\n`);
	process.exit(swift?.outcome === 'unavailable' ? 3 : swift?.outcome === 'infrastructure_failure' ? 70 : outcome === 'pass' ? 0 : 1);
}
