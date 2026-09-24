// Named browser capabilities the shell needs. Host adapters implement this; the framework never touches window, fetch, storage or sockets directly.
export interface TransportConnection {
	readonly online: boolean;
	readonly phase: 'idle' | 'loading' | 'error' | 'revoked';
	readonly error: string | undefined;
	readonly decision: string | undefined;
}

export interface RoomTransport {
	readonly streamId: string;
	readonly getState: () => TransportConnection;
	readonly subscribe: (listener: () => void) => () => void;
	readonly loadSnapshot: () => void;
	readonly submit: (commandId: string, requestDigest: string, text: string) => void;
	readonly markSeen: (seq: string) => void;
	/** Persist (or, for empty text, clear) the composer's unsent draft for this stream. A no-op Host may ignore it. */
	readonly saveDraft: (streamId: string, text: string) => void;
}

export interface EnvironmentPort {
	readonly transport: RoomTransport;
	/** Move DOM focus by element id. `defer` queues to the next task so a re-render can mount the target first. */
	readonly scheduleFocus: (domId: string, options?: { readonly defer?: boolean }) => void;
	readonly subscribeMediaQuery: (query: string, onChange: (matches: boolean) => void) => () => void;
	readonly matchesMediaQuery: (query: string) => boolean;
	readonly now: () => number;
	readonly createId: () => string;
	readonly digestText: (text: string) => Promise<string>;
	/** Run `fn` after `ms`; the returned function cancels it if it has not fired yet. */
	readonly defer: (fn: () => void, ms: number) => () => void;
}
