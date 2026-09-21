import type { RoomReceipt } from '../local-room/port.ts';
import type { LocalAnswerProposal } from './types.ts';

// Future adapter boundary only. No implementation, instance, callback parameter or import into the pure computation.
// A later adapter must reauthorize, revalidate persisted citations and atomically dedupe with the room append.
export interface LocalAnswerPostingPort {
	post(proposal: LocalAnswerProposal): Promise<
		| { readonly outcome: 'committed'; readonly receipt: RoomReceipt; readonly replayed: boolean }
		| { readonly outcome: 'denied'; readonly reason: 'unavailable_capability' | 'request_conflict' }
	>;
}
