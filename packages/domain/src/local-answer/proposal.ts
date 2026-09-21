import { deny, type AnswerContext, type AnswerIdentity, type AnswerResult, type LocalAnswerProposal } from './types.ts';
export { compileAnswerContext } from './context.ts';
export { constructAnswerCitations } from './citations.ts';
export type { AnswerContext, AnswerInput, AnswerRequest, AnswerResult, LocalAnswerProposal } from './types.ts';

export function proposeLocalAnswer(_context: AnswerContext): AnswerResult<LocalAnswerProposal> {
	return deny('unavailable_capability');
}
export function compareAnswerRequest(_previous: AnswerIdentity, _next: AnswerIdentity): AnswerResult<'new' | 'replay'> {
	return deny('unavailable_capability');
}
