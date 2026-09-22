// One timeline owner: the store holds exactly the client-core state and forwards every input to synchronize.
// It keeps no message or command copy of its own; adapters read requests from the transcript.
// Reused unchanged from the preserved React engineering checkpoint (evidence/local-room/preservation/README.md).
import { initialState, synchronize, type ClientInput, type ClientState, type Transition } from '@agora/client-core';
import { useSyncExternalStore } from 'react';

export interface TransitionRecord { readonly index: number; readonly input: ClientInput['type']; readonly requests: Transition['requests']; readonly acknowledgements: Transition['acknowledgements'] }
export interface Store {
	readonly getState: () => ClientState;
	readonly getTranscript: () => readonly TransitionRecord[];
	readonly dispatch: (input: ClientInput) => Transition;
	readonly subscribe: (listener: () => void) => () => void;
}
const transcriptLimit = 64;

export function createStore(): Store {
	let state = initialState();
	let transcript: readonly TransitionRecord[] = [];
	let index = 0;
	const listeners = new Set<() => void>();
	return {
		getState: () => state,
		getTranscript: () => transcript,
		dispatch: (input) => {
			const transition = synchronize(state, input);
			state = transition.state;
			transcript = [...transcript.slice(-(transcriptLimit - 1)), { index: index++, input: input.type, requests: transition.requests, acknowledgements: transition.acknowledgements }];
			for (const listener of listeners) listener();
			return transition;
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => { listeners.delete(listener); };
		},
	};
}

// Selectors return references owned by the frozen core state, so untouched rows keep the same object and skip rendering.
export function useSelector<T>(store: Store, selector: (state: ClientState) => T): T {
	return useSyncExternalStore(store.subscribe, () => selector(store.getState()), () => selector(store.getState()));
}
export function useTranscript(store: Store): readonly TransitionRecord[] {
	return useSyncExternalStore(store.subscribe, store.getTranscript, store.getTranscript);
}
