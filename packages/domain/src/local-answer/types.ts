import type { Digest } from '@agora/contracts/canonical';
import type { CommandId, LocalRoomIdentity, MessageCitation, MessageId, RoomMessageRecord } from '../local-room/port.ts';

export type AnswerDenial = 'unavailable_capability' | 'unsupported_input' | 'empty_context' | 'input_limit' | 'selection_limit' | 'context_limit' | 'scope_mismatch' | 'ambiguous_record' | 'missing_record' | 'invalid_sequence' | 'citation_not_selected' | 'citation_sequence_mismatch' | 'request_conflict';
export type AnswerResult<T> = { readonly outcome: 'ok'; readonly value: T } | { readonly outcome: 'denied'; readonly reason: AnswerDenial };
export const deny = (reason: AnswerDenial): AnswerResult<never> => ({ outcome: 'denied', reason });
export interface AnswerRequest { readonly scope: LocalRoomIdentity; readonly requestId: CommandId; readonly selectedIds: readonly MessageId[] }
export type AnswerInput = { readonly kind: 'persisted_messages'; readonly records: readonly RoomMessageRecord[] } | { readonly kind: 'unsupported' };
export interface AnswerIdentity { readonly key: Digest; readonly requestDigest: Digest }
// Only the compiler constructs this immutable value. The brand is not a persisted authorization token.
declare const compiled: unique symbol;
export interface AnswerContext { readonly [compiled]: true; readonly scope: LocalRoomIdentity; readonly records: readonly RoomMessageRecord[]; readonly digest: Digest; readonly identity: AnswerIdentity }
export interface AnswerClaim { readonly kind: 'stored_message_quote'; readonly text: string; readonly citation: MessageCitation }
export interface LocalAnswerProposal { readonly label: 'Deterministic local fixture (not AI inference)'; readonly contextDigest: Digest; readonly identity: AnswerIdentity; readonly claims: readonly AnswerClaim[]; readonly digest: Digest }
