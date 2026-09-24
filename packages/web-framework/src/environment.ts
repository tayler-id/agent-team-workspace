// Named browser capabilities the shell needs. Host adapters implement this; the framework never touches window, fetch, storage or sockets directly.
/**
 * `link` names the connection lifecycle observed by the Host transport, distinct from `online` (the browser's own
 * network reachability) and `phase` (the room data's loading state). `connecting` covers the initial connect and
 * every reconnect before the first successful read; `retrying` is a transient failure backing off while the browser
 * still reports itself online; `offline` is the browser reporting no network; `disconnected` is the user's own
 * manual choice, which a Host adapter must not overwrite with browser events until `reconnect` is called.
 */
export type ConnectionLink = 'connecting' | 'online' | 'retrying' | 'offline' | 'disconnected';
export interface TransportConnection {
	readonly online: boolean;
	readonly phase: 'idle' | 'loading' | 'error' | 'revoked';
	readonly error: string | undefined;
	readonly decision: string | undefined;
	readonly link: ConnectionLink;
}

export interface RoomTransport {
	readonly streamId: string;
	readonly getState: () => TransportConnection;
	readonly subscribe: (listener: () => void) => () => void;
	readonly loadSnapshot: () => void;
	readonly submit: (commandId: string, requestDigest: string, text: string) => void;
	readonly markSeen: (seq: string) => void;
	/** Cancels in-flight polling and command retries and stops reconnecting until `reconnect` is called. */
	readonly disconnect: () => void;
	/** Resumes polling from the last applied cursor and, if a send was waiting on `wait_connection`, retries it. */
	readonly reconnect: () => void;
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
