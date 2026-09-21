import type { MessageCitation } from '../local-room/port.ts';
import { deny, type AnswerContext, type AnswerResult } from './types.ts';

export function constructAnswerCitations(context: AnswerContext, citations: readonly MessageCitation[]): AnswerResult<readonly MessageCitation[]> {
	if (!citations.length) return deny('empty_context');
	if (citations.length > 10) return deny('selection_limit');
	for (const citation of citations) {
		const record = context.records.find(m => m.messageId === citation.recordId);
		if (!record) return deny('citation_not_selected');
		if (record.roomSeq !== citation.roomSeq) return deny('citation_sequence_mismatch');
	}
	return { outcome: 'ok', value: Object.freeze(citations.map(c => Object.freeze({ recordId: c.recordId, roomSeq: c.roomSeq }))) };
}
