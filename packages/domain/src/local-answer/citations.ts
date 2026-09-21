import type { MessageCitation } from '../local-room/port.ts';
import { deny, type AnswerContext, type AnswerResult } from './types.ts';

export function constructAnswerCitations(_context: AnswerContext, _citations: readonly MessageCitation[]): AnswerResult<readonly MessageCitation[]> {
	return deny('unavailable_capability');
}
