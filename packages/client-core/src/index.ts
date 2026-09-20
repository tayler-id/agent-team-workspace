// R22 test-only baseline for the next slice's behavioral red. No synchronization is implemented here.
export interface ClientState {
	readonly rooms: readonly unknown[];
	readonly commands: readonly unknown[];
	readonly drafts: readonly unknown[];
}
export interface Transition {
	readonly state: ClientState;
	readonly acknowledgements: readonly unknown[];
	readonly requests: readonly unknown[];
}
export function initialState(): ClientState {
	return Object.freeze({ rooms: Object.freeze([]), commands: Object.freeze([]), drafts: Object.freeze([]) });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Test-only stub until the implementation slice.
export function synchronize(state: ClientState, input: unknown): Transition {
	return Object.freeze({ state, acknowledgements: Object.freeze([]), requests: Object.freeze([]) });
}
