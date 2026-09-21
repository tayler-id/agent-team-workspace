import { digestCanonical } from '@agora/contracts/canonical';
import { deny, type AnswerContext, type AnswerInput, type AnswerRequest, type AnswerResult } from './types.ts';

export const ANSWER_LIMITS = Object.freeze({ inputRecords: 100, selectedRecords: 10, contextScalars: 4096 });
const validSeq = (seq: string): boolean => /^[1-9][0-9]{0,18}$/.test(seq) && BigInt(seq) <= 9223372036854775807n;

// The caller supplies validated persisted records, not wire bytes, events or a read capability.
export function compileAnswerContext(request: AnswerRequest, input: AnswerInput): AnswerResult<AnswerContext> {
	if (input.kind !== 'persisted_messages') return deny('unsupported_input');
	if (input.records.length > ANSWER_LIMITS.inputRecords) return deny('input_limit');
	if (!request.selectedIds.length) return deny('empty_context');
	if (request.selectedIds.length > ANSWER_LIMITS.selectedRecords) return deny('selection_limit');
	const ids = new Set<string>(), sequences = new Set<string>();
	for (const m of input.records) {
		if (!['human', 'local_agent'].includes(m.author.kind)) return deny('unsupported_input');
		if (!m.body.length || m.body.length > 8192 || Array.from(m.body).length > 4096 || m.citations.length > 10) return deny('input_limit');
		if (m.projectId !== request.scope.projectId || m.roomId !== request.scope.roomId) return deny('scope_mismatch');
		if (!validSeq(m.roomSeq)) return deny('invalid_sequence');
		if (ids.has(m.messageId) || sequences.has(m.roomSeq)) return deny('ambiguous_record');
		ids.add(m.messageId); sequences.add(m.roomSeq);
	}
	const selected = new Set(request.selectedIds);
	if (selected.size !== request.selectedIds.length) return deny('ambiguous_record');
	if (request.selectedIds.some(id => !ids.has(id))) return deny('missing_record');
	const chosen = input.records.filter(m => selected.has(m.messageId)).sort((a, b) => BigInt(a.roomSeq) < BigInt(b.roomSeq) ? -1 : 1);
	if (chosen.reduce((n, m) => n + Array.from(m.body).length, 0) > ANSWER_LIMITS.contextScalars) return deny('context_limit');
	const scope = Object.freeze({ ...request.scope });
	const records = Object.freeze(chosen.map(m => Object.freeze({
		messageId: m.messageId, projectId: m.projectId, roomId: m.roomId, roomSeq: m.roomSeq,
		author: Object.freeze({ kind: m.author.kind, principalId: m.author.principalId }),
		commandId: m.commandId, body: m.body, createdAt: m.createdAt,
		citations: Object.freeze(m.citations.map(c => Object.freeze({ recordId: c.recordId, roomSeq: c.roomSeq }))),
	})));
	const digest = digestCanonical({ version: 'agora.local-answer.context/v1', scope, records: [...records].map(m => ({ ...m, citations: [...m.citations] })) });
	const key = digestCanonical({ version: 'agora.local-answer.request/v1', scope, requestId: request.requestId });
	const identity = Object.freeze({ key, requestDigest: digest });
	return { outcome: 'ok', value: Object.freeze({ scope, records, digest, identity }) as AnswerContext };
}
