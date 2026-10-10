import type { CoreEvent, Message, Snapshot } from '@agora/client-core';

// Deterministic, versioned corpus for the FB-4 replay predicate. It only builds shapes the local room publishes today
// (visible messages at revision 1, as apps/web/src/host/live.ts maps RoomMessage); nothing else is invented.
export const CORPUS_VERSION = 'agora.replay-corpus/v1';
export const DEFAULT_SEED = 0x5eed01;
export const HISTORY = 200;
export const MISSED = 1000;
export const ARRIVING = 100;
export const PAGE = 50;
export const BODY_LIMIT = 4096;
export const UNAVAILABLE = [
	{ shape: 'thread', reason: 'no published thread wire shape' },
	{ shape: 'edit', reason: 'the local room publishes revision 1 only' },
	{ shape: 'tombstone', reason: 'the local room has no delete wire shape' },
	{ shape: 'run-card', reason: 'no published run-card event reaches the local room' },
] as const;

export interface ReplayCorpus {
	version: typeof CORPUS_VERSION;
	seed: number;
	streamId: string;
	snapshot: Snapshot;
	/** Ids in the one correct final order. */
	expectedIds: string[];
	expectedBodies: string[];
	finalSeq: string;
	/** Delivery schedule: arrivals land first and ahead of the gap, then replay pages with shuffled and re-sent entries. */
	inputs: CoreEvent[];
}

export function prng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const CODE = [
	'```ts\nexport async function resume(stream: string, after: bigint): Promise<readonly Event[]> {\n\tconst page = await fetch(`/events?after=${after}`);\n\tif (!page.ok) throw new Error(`replay failed: ${page.status}`);\n\treturn (await page.json()).events;\n}\n```',
	'```python\ndef dedupe(events):\n    seen = set()\n    for e in sorted(events, key=lambda e: int(e["seq"])):\n        if e["seq"] in seen:\n            continue\n        seen.add(e["seq"])\n        yield e\n```',
	'```diff\n- if (seq <= cursor) return state\n+ if (seq <= cursor || pending.has(seq)) return state\n```',
	'```sh\npnpm client:replay -- --json\nnode scripts/local-room.ts replay --after 0\n```',
	'```sql\nselect room_seq, body from room_messages\nwhere room_id = $1 and room_seq > $2\norder by room_seq limit 50;\n```',
];
const PROSE = [
	'## Replay notes\n\n- Apply **contiguous** events only.\n- Buffer gaps, never invent a cursor.\n- Re-sent copies are dropped silently.',
	'| seq | state |\n| --- | --- |\n| 41 | applied |\n| 42 | buffered |\n| 44 | gap |',
	'> Quoted from an earlier message: the cursor only moves forward.\n\nUnicode survives: naïve café, 日本語のテキスト, Ωmega, 🚀.',
	'1. Take the snapshot.\n2. Ask for events after its cursor.\n3. Converge, then acknowledge the applied prefix.\n\nSee [the guide](docs/site/local-room.md#replay) and `synchronize()`.',
];

function body(next: () => number, index: number): string {
	const target = 1200 + Math.floor(next() * 2800);
	const blocks = [`message ${index}`];
	let length = blocks[0]?.length ?? 0;
	while (length < target) {
		const pool = next() < 0.5 ? CODE : PROSE;
		const block = pool[Math.floor(next() * pool.length)] ?? '';
		blocks.push(block);
		length += block.length + 2;
	}
	return Array.from(blocks.join('\n\n')).slice(0, BODY_LIMIT).join('');
}

const hex = (next: () => number, n: number): string => Array.from({ length: n }, () => Math.floor(next() * 16).toString(16)).join('');
const uuid = (next: () => number): string => `${hex(next, 8)}-${hex(next, 4)}-4${hex(next, 3)}-8${hex(next, 3)}-${hex(next, 12)}`;

export function buildCorpus(seed = DEFAULT_SEED): ReplayCorpus {
	const next = prng(seed);
	const streamId = uuid(next);
	const total = HISTORY + MISSED + ARRIVING;
	const all = Array.from({ length: total }, (_, i) => ({ id: uuid(next), createdSeq: String(i + 1), revision: '1', content: { tag: 'visible' as const, body: body(next, i + 1) } }));
	const event = (i: number): CoreEvent => ({ type: 'event', streamId, seq: String(i + 1), change: { type: 'message', message: all[i] as Message } });
	const shuffle = <T>(items: T[]): T[] => {
		for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [items[i], items[j]] = [items[j] as T, items[i] as T]; }
		return items;
	};
	const snapshot: Snapshot = { type: 'snapshot', streamId, cursor: String(HISTORY), lastSeen: String(HISTORY), messages: all.slice(0, HISTORY), runs: [] };
	// 100 arrivals reach the client first, each delivered twice, so the whole run starts behind a gap.
	const arrivals = shuffle(Array.from({ length: ARRIVING }, (_, i) => HISTORY + MISSED + i).flatMap((i) => [event(i), event(i)]));
	const inputs: CoreEvent[] = [...arrivals];
	// Replay pages of 50: each page is shuffled, and each page re-sends the previous page's last entry, as a cursor retry would.
	for (let from = HISTORY; from < HISTORY + MISSED; from += PAGE) {
		const page = Array.from({ length: PAGE }, (_, i) => event(from + i));
		inputs.push(...shuffle(from > HISTORY ? [event(from - 1), ...page] : page));
	}
	return { version: CORPUS_VERSION, seed, streamId, snapshot, expectedIds: all.map((m) => m.id), expectedBodies: all.map((m) => m.content.body), finalSeq: String(total), inputs };
}
