import { digestCanonical } from '@agora/contracts/canonical';
import { constructAnswerCitations } from './citations.ts';
import { deny, type AnswerContext, type AnswerIdentity, type AnswerResult, type LocalAnswerProposal } from './types.ts';
export { compileAnswerContext, ANSWER_LIMITS } from './context.ts';
export { constructAnswerCitations } from './citations.ts';
export type { AnswerContext, AnswerInput, AnswerRequest, AnswerResult, LocalAnswerProposal } from './types.ts';
export type { LocalAnswerPostingPort } from './posting.ts';

// A claim is only that the cited stored record contains this exact text. No semantic inference or instruction parsing.
export function proposeLocalAnswer(context: AnswerContext): AnswerResult<LocalAnswerProposal> {
	const citations = constructAnswerCitations(context, context.records.map(m => ({ recordId: m.messageId, roomSeq: m.roomSeq })));
	if (citations.outcome === 'denied') return citations;
	const claims = context.records.map((m, i) => {
		const citation = citations.value[i];
		if (!citation) throw new Error('citation construction lost a selected record');
		return Object.freeze({ kind: 'stored_message_quote' as const, text: m.body, citation });
	});
	const proposal = { label: 'Deterministic local fixture (not AI inference)' as const, contextDigest: context.digest, identity: { ...context.identity }, claims };
	const digest = digestCanonical({ ...proposal, claims: claims.map(c => ({ ...c, citation: { ...c.citation } })) });
	return { outcome: 'ok', value: Object.freeze({ ...proposal, identity: Object.freeze(proposal.identity), claims: Object.freeze(claims), digest }) };
}
export function compareAnswerRequest(previous: AnswerIdentity, next: AnswerIdentity): AnswerResult<'new' | 'replay'> {
	if (previous.key !== next.key) return { outcome: 'ok', value: 'new' };
	return previous.requestDigest === next.requestDigest ? { outcome: 'ok', value: 'replay' } : deny('request_conflict');
}
