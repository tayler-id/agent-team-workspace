import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import type { ClientInput, ClientState, Transition } from '@agora/client-core';
import { buildCorpus, DEFAULT_SEED, UNAVAILABLE, type ReplayCorpus } from './replay-corpus.ts';

// R23/FB-4: resume 1,000 missed events (plus 100 arrivals) within two seconds, without duplicates or gaps.
export const BUDGET_MS = 2000;
export interface Core { initialState: () => ClientState; synchronize: (state: ClientState, input: ClientInput) => Transition }
export interface ReplayReport {
	version: string; seed: number; outcome: 'pass' | 'fail'; failures: string[];
	counts: { history: number; delivered: number; messages: number; unique: number; duplicates: number };
	order: 'converged' | 'diverged'; acknowledgements: { count: number; strictlyIncreasing: boolean; last: string | undefined };
	elapsedMs: number; budgetMs: number;
	coverage: { exercised: string[]; unavailable: typeof UNAVAILABLE };
}

/** Drives every corpus input through the given core and judges convergence. Timing covers only the synchronize calls. */
export function runReplay(core: Core, corpus: ReplayCorpus = buildCorpus(), budgetMs = BUDGET_MS): ReplayReport {
	const acks: string[] = [];
	const requests: string[] = [];
	let state = core.initialState();
	const started = performance.now();
	state = core.synchronize(state, corpus.snapshot).state;
	for (const input of corpus.inputs) {
		const step = core.synchronize(state, input);
		state = step.state;
		acks.push(...step.acknowledgements.map((a) => a.seq));
		requests.push(...step.requests.map((r) => r.type));
	}
	const elapsedMs = performance.now() - started;
	const room = state.rooms[0];
	const ids = room?.messages.map((m) => m.id) ?? [];
	const unique = new Set(ids).size;
	const increasing = acks.every((seq, i) => i === 0 || BigInt(seq) > BigInt(acks[i - 1] ?? '0'));
	const sameOrder = ids.length === corpus.expectedIds.length && ids.every((id, i) => id === corpus.expectedIds[i]);
	const sameBodies = room?.messages.every((m, i) => m.content.tag === 'visible' && m.content.body === corpus.expectedBodies[i]) ?? false;
	const failures: string[] = [];
	if (!room) failures.push('no room projected');
	else {
		if (room.mode !== 'live') failures.push(`mode ${room.mode}`);
		if (room.pending.length) failures.push(`${room.pending.length} entries left pending`);
		if (room.cursor !== corpus.finalSeq) failures.push(`cursor ${room.cursor} != ${corpus.finalSeq}`);
	}
	if (ids.length !== unique) failures.push(`${ids.length - unique} duplicate messages`);
	if (!sameOrder) failures.push('message order or membership diverged');
	if (!sameBodies) failures.push('message bodies diverged');
	if (!increasing) failures.push('acknowledgements repeat or regress');
	if (acks.at(-1) !== corpus.finalSeq) failures.push(`last acknowledgement ${acks.at(-1)} != ${corpus.finalSeq}`);
	if (requests.some((type) => type === 'snapshot' || type === 'upgrade')) failures.push('core demanded a new snapshot or upgrade');
	if (elapsedMs > budgetMs) failures.push(`${elapsedMs.toFixed(1)} ms exceeds the ${budgetMs} ms budget`);
	return {
		version: corpus.version, seed: corpus.seed, outcome: failures.length ? 'fail' : 'pass', failures,
		counts: { history: corpus.snapshot.messages.length, delivered: corpus.inputs.length, messages: ids.length, unique, duplicates: ids.length - unique },
		order: sameOrder ? 'converged' : 'diverged', acknowledgements: { count: acks.length, strictlyIncreasing: increasing, last: acks.at(-1) },
		elapsedMs: Math.round(elapsedMs * 10) / 10, budgetMs,
		coverage: { exercised: ['snapshot', 'visible message events at revision 1', 'gap buffering', 'duplicate and re-sent copies', 'out-of-order replay pages'], unavailable: UNAVAILABLE },
	};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const seed = process.argv[2] ? Number(process.argv[2]) : DEFAULT_SEED;
	const core: Core = await import('@agora/client-core');
	const report = runReplay(core, buildCorpus(seed));
	process.stdout.write(`${JSON.stringify(report, null, '\t')}\n`);
	process.exit(report.outcome === 'pass' ? 0 : 1);
}
