import { initialState, synchronize, type ClientInput, type ClientState, type Transition } from '@agora/client-core';
import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactElement, type ReactNode } from 'react';
import type { EnvironmentPort, TransportConnection } from './environment.ts';
import type { Row } from './projection.ts';

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

/**
 * Announces a growth in the room's `unread` count after `delayMs`, so a burst of arrivals reads as one notice that
 * repeats the header's unread total. `undefined` (no room loaded) resets the baseline, so the snapshot that loads a
 * room is not an arrival. Any drop, such as marking the room read, clears the notice instead of leaving a stale one.
 */
export function useDelayedAnnouncement(unread: number | undefined, delayMs: number): string {
	const [announcement, setAnnouncement] = useState('');
	const announced = useRef<number | undefined>(undefined);
	const { defer } = useEnvironment();
	useEffect(() => {
		const base = announced.current;
		if (unread === undefined || base === undefined || unread < base) { announced.current = unread; setAnnouncement(''); return; }
		if (unread === base) return;
		return defer(() => {
			announced.current = unread;
			setAnnouncement(`${unread - base} new message${unread - base === 1 ? '' : 's'}, ${unread} unread.`);
		}, delayMs);
	}, [unread, delayMs, defer]);
	return announcement;
}

/** Two-step focus request: clears any pending target, then sets the new one on the next task so a re-render can mount it first. */
export function useDeferredFocus(): readonly [string | undefined, (id: string) => void] {
	const [focusRequest, setFocusRequest] = useState<string | undefined>(undefined);
	const { defer } = useEnvironment();
	const request = useCallback((id: string): void => {
		setFocusRequest(undefined);
		defer(() => { setFocusRequest(id); }, 0);
	}, [defer]);
	return [focusRequest, request];
}

/** Widens the caller's own `limit` window until `focusRequest` is included, then activates and schedules focus on it. */
export function useFocusRequestEffect(focusRequest: string | undefined, rows: readonly Row[], limit: number, pageSize: number, setLimit: (limit: number) => void, setActiveId: (id: string | undefined) => void, scheduleFocus: (domId: string) => void, rowDomId: (id: string) => string): void {
	useEffect(() => {
		if (!focusRequest) return;
		const index = rows.findIndex((r) => r.message.id === focusRequest);
		if (index < 0) return;
		const needed = rows.length - index;
		if (needed > limit) { setLimit(Math.ceil(needed / pageSize) * pageSize); return; }
		setActiveId(focusRequest);
		// Sync focus after the limit window includes the target (effect re-runs once setLimit commits).
		scheduleFocus(rowDomId(focusRequest));
	}, [focusRequest, rows, limit, pageSize, setLimit, setActiveId, scheduleFocus, rowDomId]);
}
