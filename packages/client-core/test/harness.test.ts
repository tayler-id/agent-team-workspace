import { expect, test } from 'vitest';
import { initialState, synchronize } from '@agora/client-core';

test('the test-only public harness starts empty and accepts an idle step without acknowledgement', () => {
	const initial = initialState();
	expect(initial).toEqual({ rooms: [], commands: [], drafts: [] });
	expect(synchronize(initial, { type: 'idle' })).toEqual({ state: { rooms: [], commands: [], drafts: [] }, acknowledgements: [], requests: [] });
	expect(Object.isFrozen(initial)).toBe(true);
	expect(Object.values(initial).map((v) => Object.isFrozen(v))).toEqual([true, true, true]);
});
