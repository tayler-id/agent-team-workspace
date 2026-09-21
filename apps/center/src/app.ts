import { randomUUID } from 'node:crypto';
import { createWireValidator, digestCanonical, type Schema } from '@agora/contracts';
import { asCommandId, asMessageId, asProjectId, asRoomId, asScopeId, decideFixtureScopeAccess, FIXTURE_POLICY, FIXTURE_POLICY_DIGEST, type LocalRoomPort, type RoomMessageRecord, type RoomReceipt, type SendRoomMessage, unsupportedLocalRoom } from '@agora/domain';
import { Hono } from 'hono';

// Wire types come only from the generated contract consumer; the center authors no wire shape of its own.
export type HealthReport = Schema<'HealthReport'>;
export type ReadinessReport = Schema<'ReadinessReport'>;
export type FixturePolicyDecisionReport = Schema<'FixturePolicyDecisionReport'>;
export type ErrorReport = Schema<'ErrorReport'>;

export interface CenterDependencies {
	probeDatabase(): Promise<boolean>;
	// Explicit adapter selection for the local room. Absent means no persistence path is composed: sends and snapshots answer a typed 404.
	localRoom?: LocalRoomPort;
}

const wire = createWireValidator();
// R07 status of each typed denial the room can dispatch.
const DENIAL_STATUS = { scope_mismatch: 404, not_found: 404, command_conflict: 409, unavailable_capability: 404 } as const;

function toSendRoomMessage(command: Schema<'SendRoomMessageCommand'>): SendRoomMessage {
	return {
		commandId: asCommandId(command.command_id),
		projectId: asProjectId(command.scope.project_id),
		roomId: asRoomId(command.scope.room_id),
		body: command.body,
		citations: command.citations.map((citation) => ({ recordId: asMessageId(citation.record_id), roomSeq: citation.room_seq })),
		requestDigest: digestCanonical(command),
	};
}

const toWireMessage = (m: RoomMessageRecord): Schema<'RoomMessage'> => ({
	schema_version: 'agora.local-room.message/v1',
	message_id: m.messageId,
	scope: { project_id: m.projectId, room_id: m.roomId },
	room_seq: m.roomSeq,
	author: { kind: m.author.kind, principal_id: m.author.principalId },
	command_id: m.commandId,
	body: m.body,
	citations: m.citations.map((c) => ({ record_kind: 'message', record_id: c.recordId, room_seq: c.roomSeq })),
	created_at: m.createdAt,
});

const toWireReceipt = (r: RoomReceipt, replayed: boolean): Schema<'RoomCommandReceipt'> => ({
	schema_version: 'agora.local-room.receipt/v1',
	identity: { command_id: r.commandId, request_digest: r.requestDigest },
	receipt: { command_id: r.commandId, aggregate_id: r.roomId, revision: r.revision, event_cursors: [{ stream_id: r.roomId, committed_seq: r.revision }], receipt_id: r.receiptId },
	message_id: r.messageId,
	replayed,
});

export function createApp(deps: CenterDependencies): Hono {
	const localRoom = deps.localRoom ?? unsupportedLocalRoom;
	const app = new Hono();
	app.notFound((c) => c.json<ErrorReport>({ reason_code: 'not_found', correlation_id: randomUUID() }, 404));
	app.onError((error, c) => {
		console.error(JSON.stringify({ schema_version: 'agora.center-error/v1', message: error.message }));
		return c.json<ErrorReport>({ reason_code: 'infrastructure_failure', correlation_id: randomUUID() }, 500);
	});
	app.get('/api/v1/health', (c) => c.json<HealthReport>({ schema_version: 'agora.health/v1', status: 'ok', service: 'agora-center' }));
	app.get('/api/v1/health/ready', async (c) => {
		const database = (await deps.probeDatabase()) ? 'ok' : 'unavailable';
		const report: ReadinessReport = { schema_version: 'agora.readiness/v1', status: database === 'ok' ? 'ready' : 'not_ready', checks: { database } };
		return c.json(report, report.status === 'ready' ? 200 : 503);
	});
	app.post('/api/v1/fixture/policy/decisions', async (c) => {
		const body: unknown = await c.req.json().catch(() => undefined);
		const command = wire.validate('FixturePolicyCommand', body);
		if (!command.ok) return c.json<ErrorReport>({ reason_code: 'malformed_command', correlation_id: randomUUID(), details: command.details }, 400);
		const decision = decideFixtureScopeAccess({ scopeId: asScopeId(command.value.actor.scope_id) }, { scopeId: asScopeId(command.value.subject.scope_id) });
		return c.json<FixturePolicyDecisionReport>({ schema_version: 'agora.fixture-policy-decision/v1', ...decision, policy_version: FIXTURE_POLICY.version, policy_digest: FIXTURE_POLICY_DIGEST });
	});
	app.post('/api/v1/local-room/messages', async (c) => {
		const body: unknown = await c.req.json().catch(() => undefined);
		const command = wire.validate('SendRoomMessageCommand', body);
		if (!command.ok) return c.json<ErrorReport>({ reason_code: 'malformed_command', correlation_id: randomUUID(), details: command.details }, 400);
		const result = await localRoom.send(toSendRoomMessage(command.value));
		if (result.outcome === 'committed') return c.json(toWireReceipt(result.receipt, result.replayed), 201);
		return c.json<ErrorReport>({ reason_code: result.reasonCode, correlation_id: randomUUID(), details: [result.detail] }, DENIAL_STATUS[result.reasonCode]);
	});
	app.get('/api/v1/local-room/snapshot', async (c) => {
		const result = await localRoom.snapshot();
		if (result.outcome === 'unsupported') return c.json<ErrorReport>({ reason_code: result.reasonCode, correlation_id: randomUUID(), details: [result.detail] }, 404);
		const { snapshot } = result;
		return c.json<Schema<'RoomSnapshot'>>({ schema_version: 'agora.local-room.snapshot/v1', scope: { project_id: snapshot.projectId, room_id: snapshot.roomId }, cursor: { stream_id: snapshot.roomId, committed_seq: snapshot.committedSeq }, messages: snapshot.messages.map(toWireMessage) });
	});
	return app;
}
