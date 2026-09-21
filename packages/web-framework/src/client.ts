import { initialState, synchronize, type ClientInput, type ClientState, type Transition } from '@agora/client-core';
import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactElement, type ReactNode } from 'react';
import type { EnvironmentPort, TransportConnection } from './environment.ts';

export interface TransitionRecord {
	readonly index: number;
	readonly input: ClientInput['type'];
	readonly requests: Transition['requests'];
	readonly acknowledgements: Transition['acknowledgements'];
}

export interface RoomClient {
	readonly getState: () => ClientState;
	readonly getTranscript: () => readonly TransitionRecord[];
	readonly apply: (input: ClientInput) => Transition;
	readonly subscribe: (listener: () => void) => () => void;
}

const transcriptLimit = 64;

export function createRoomClient(): RoomClient {
	let state = initialState();
	let transcript: readonly TransitionRecord[] = [];
	let index = 0;
	const listeners = new Set<() => void>();
	return {
		getState: () => state,
		getTranscript: () => transcript,
		apply: (input) => {
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

const ClientContext = createContext<RoomClient | null>(null);
const EnvironmentContext = createContext<EnvironmentPort | null>(null);

export function AgoraProvider({ client, environment, children }: { readonly client: RoomClient; readonly environment: EnvironmentPort; readonly children: ReactNode }): ReactElement {
	return createElement(ClientContext.Provider, { value: client }, createElement(EnvironmentContext.Provider, { value: environment }, children));
}

function useClient(): RoomClient {
	const client = useContext(ClientContext);
	if (!client) throw new Error('AgoraProvider required');
	return client;
}

export function useEnvironment(): EnvironmentPort {
	const environment = useContext(EnvironmentContext);
	if (!environment) throw new Error('AgoraProvider required');
	return environment;
}

export function useClientSelector<T>(selector: (state: ClientState) => T): T {
	const client = useClient();
	return useSyncExternalStore(client.subscribe, () => selector(client.getState()), () => selector(client.getState()));
}

export function useTranscript(): readonly TransitionRecord[] {
	const client = useClient();
	return useSyncExternalStore(client.subscribe, client.getTranscript, client.getTranscript);
}

export function useTransportState(): TransportConnection {
	const { transport } = useEnvironment();
	return useSyncExternalStore(transport.subscribe, transport.getState, transport.getState);
}

export function useMediaQuery(query: string): boolean {
	const environment = useEnvironment();
	const subscribe = useCallback((listener: () => void): (() => void) => environment.subscribeMediaQuery(query, () => { listener(); }), [environment, query]);
	const get = useCallback((): boolean => environment.matchesMediaQuery(query), [environment, query]);
	return useSyncExternalStore(subscribe, get, () => false);
}

export function useSetDraft(): (streamId: string, text: string) => void {
	const client = useClient();
	return useCallback((streamId: string, text: string): void => { client.apply({ type: 'draft', streamId, text }); }, [client]);
}

export function useRoomCommands(): {
	readonly loadSnapshot: () => void;
	readonly markSeen: (seq: string) => void;
	readonly submit: (text: string) => Promise<void>;
} {
	const environment = useEnvironment();
	const alive = useRef(true);
	useEffect(() => {
		alive.current = true;
		return () => { alive.current = false; };
	}, []);
	return {
		loadSnapshot: environment.transport.loadSnapshot,
		markSeen: environment.transport.markSeen,
		submit: async (text: string): Promise<void> => {
			const requestDigest = await environment.digestText(text);
			if (!alive.current) return;
			environment.transport.submit(environment.createId(), requestDigest, text);
		},
	};
}

export function useStaleSafeBusy(): { readonly busy: boolean; readonly run: (work: () => Promise<void>) => void } {
	const [busy, setBusy] = useState(false);
	const alive = useRef(true);
	const token = useRef(0);
	useEffect(() => {
		alive.current = true;
		return () => { alive.current = false; token.current += 1; };
	}, []);
	return {
		busy,
		run: (work) => {
			const mine = ++token.current;
			setBusy(true);
			void work().finally(() => { if (alive.current && token.current === mine) setBusy(false); });
		},
	};
}

export function useScheduleFocus(): EnvironmentPort['scheduleFocus'] {
	return useEnvironment().scheduleFocus;
}
