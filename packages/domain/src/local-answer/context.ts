import { deny, type AnswerContext, type AnswerInput, type AnswerRequest, type AnswerResult } from './types.ts';

// Test-only harness revision: the public decision loads but no response capability exists yet.
export function compileAnswerContext(_request: AnswerRequest, _input: AnswerInput): AnswerResult<AnswerContext> {
	return deny('unavailable_capability');
}
