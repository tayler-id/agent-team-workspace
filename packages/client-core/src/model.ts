import type { components } from '@agora/contracts/values';

type Id = components['schemas']['Uuid'];
type Seq = components['schemas']['Revision'];
export type Frozen<T> = T extends object ? { readonly [K in keyof T]: Frozen<T[K]> } : T;
export type Receipt = Frozen<components['schemas']['CommandReceipt']>;
export interface Message { id: Id; createdSeq: Seq; revision: Seq; content: { tag: 'visible'; body: string } | { tag: 'tombstone' } }
export interface RunCard { id: Id; revision: Seq; state: string }
export interface CoreEvent { type: 'event'; streamId: Id; seq: Seq; change: { type: 'message'; message: Message } | { type: 'run'; run: RunCard } }
export interface Snapshot { type: 'snapshot'; streamId: Id; cursor: Seq; lastSeen: Seq; messages: Message[]; runs: RunCard[] }
interface Room { streamId: Id; cursor: Seq; lastSeen: Seq; mode: 'live' | 'gap' | 'resync' | 'upgrade'; unread: number; messages: Message[]; runs: RunCard[]; pending: CoreEvent[] }
interface CommandBase { commandId: Id; streamId: Id; requestDigest: components['schemas']['Digest'] }
type Command = CommandBase & ({ tag: 'pending' } | { tag: 'received'; receipt: Receipt });
export type ClientState = Frozen<{ rooms: Room[]; commands: Command[]; drafts: { streamId: Id; text: string; tag: 'unsent' }[] }>;
export type ClientInput = Snapshot | CoreEvent
	| { type: 'idle' }
	| { type: 'unsupported'; streamId: Id }
	| { type: 'resync'; streamId: Id }
	| { type: 'seen'; streamId: Id; seq: Seq }
	| { type: 'draft'; streamId: Id; text: string }
	| { type: 'clear'; reason: 'logout' | 'revoked' }
	| ({ type: 'submit'; online: boolean } & CommandBase)
	| { type: 'receipt'; receipt: Receipt }
	| { type: 'retry'; commandId: Id; requestDigest: string; online: boolean; failure: { tag: 'timeout' | 'stale_revision' | 'denied' } | { tag: 'rate_limited'; retryAfterSeconds: number } };
export type Request = { type: 'replay'; streamId: Id; after: Seq }
	| { type: 'snapshot' | 'upgrade'; streamId: Id }
	| { type: 'send' | 'conflict' | 'resend_same_command' | 'wait_connection' | 'receipt_known' | 'refresh_snapshot' | 'stop'; commandId: Id }
	| { type: 'wait_retry_after'; commandId: Id; retryAfterSeconds: number };
export interface Transition { readonly state: ClientState; readonly acknowledgements: readonly { streamId: Id; seq: Seq }[]; readonly requests: readonly Request[] }
