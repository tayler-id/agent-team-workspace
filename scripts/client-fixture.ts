// Test-fixture adapter, deliberately outside the core. No service route or transport implementation.
import { createWireValidator } from '@agora/contracts';
import type { ClientInput, Receipt, Snapshot } from '@agora/client-core';
const validator = createWireValidator();
export function fixtureSnapshot(value: unknown): Snapshot | undefined {
	const parsed = validator.validate('FixtureSyncSnapshot', value);
	if (!parsed.ok) return undefined;
	const snapshot = parsed.value;
	return {
		type: 'snapshot', streamId: snapshot.cursor.stream_id.toLowerCase(), cursor: snapshot.cursor.committed_seq, lastSeen: snapshot.last_seen_room_seq,
		messages: [...snapshot.state.messages.map((m) => ({ id: m.message_id.toLowerCase(), createdSeq: m.created_seq, revision: m.revision, content: { tag: 'visible' as const, body: m.body } })), ...snapshot.state.tombstones.map((m) => ({ id: m.message_id.toLowerCase(), createdSeq: m.created_seq, revision: m.revision, content: { tag: 'tombstone' as const } }))],
		runs: snapshot.state.run_cards.map((r) => ({ id: r.run_id.toLowerCase(), revision: r.run_revision, state: r.state })),
	};
}
export function fixtureEvent(streamId: string, value: unknown): ClientInput {
	for (const component of ['FixtureSyncMessageEvent', 'FixtureSyncTombstoneEvent', 'FixtureSyncRunCardEvent'] as const) {
		const parsed = validator.validate(component, value);
		if (!parsed.ok || parsed.value.stream_id.toLowerCase() !== streamId) continue;
		const event = parsed.value;
		switch (event.kind) {
			case 'fixture.message_revision': return { type: 'event', streamId, seq: event.seq, change: { type: 'message', message: { id: event.payload.message_id.toLowerCase(), createdSeq: event.payload.created_seq, revision: event.payload.revision, content: { tag: 'visible', body: event.payload.body } } } };
			case 'fixture.message_tombstone': return { type: 'event', streamId, seq: event.seq, change: { type: 'message', message: { id: event.payload.message_id.toLowerCase(), createdSeq: event.payload.created_seq, revision: event.payload.revision, content: { tag: 'tombstone' } } } };
			case 'fixture.run_card': return { type: 'event', streamId, seq: event.seq, change: { type: 'run', run: { id: event.payload.run_id.toLowerCase(), revision: event.payload.run_revision, state: event.payload.state } } };
		}
	}
	return { type: 'unsupported', streamId };
}
export function fixtureReceipt(value: unknown): Receipt | undefined {
	const parsed = validator.validate('CommandReceipt', value);
	if (!parsed.ok) return undefined;
	const receipt = parsed.value;
	return { ...receipt, command_id: receipt.command_id.toLowerCase(), aggregate_id: receipt.aggregate_id.toLowerCase(), receipt_id: receipt.receipt_id.toLowerCase(), event_cursors: receipt.event_cursors.map((c) => ({ ...c, stream_id: c.stream_id.toLowerCase() })) };
}
