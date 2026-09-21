// Narrow typed room transport port. Room-shell components depend only on this shape, never on the fixture
// module or a future service client, so a later real transport can implement it without touching components.
import { useSyncExternalStore } from 'react';
import type { Connection } from '../projection.ts';

export interface RoomHeader { readonly project: string; readonly room: string; readonly lifecycle: string; readonly agentLabel: string; readonly members: number }
export interface TransportState extends Connection { readonly decision: string | undefined }
export interface RoomTransportPort {
	readonly streamId: string;
	readonly getState: () => TransportState;
	readonly subscribe: (listener: () => void) => () => void;
	readonly loadSnapshot: () => void;
	readonly submit: (commandId: string, requestDigest: string, text: string) => void;
	readonly markSeen: (seq: string) => void;
}

export function useTransportState(port: RoomTransportPort): TransportState {
	return useSyncExternalStore(port.subscribe, port.getState, port.getState);
}
