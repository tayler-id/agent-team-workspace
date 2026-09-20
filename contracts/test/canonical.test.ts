import { expect, test } from 'vitest';
import { canonicalJson, digestCanonical } from '@agora/contracts';

test('canonicalJson sorts member names recursively and drops whitespace', () => {
	expect(canonicalJson({ b: 1, a: [{ d: 'x', c: null }], e: { z: true, y: 2.5 } })).toBe('{"a":[{"c":null,"d":"x"}],"b":1,"e":{"y":2.5,"z":true}}');
});

test('canonicalJson rejects non-finite numbers with the offending path', () => {
	expect(() => canonicalJson({ ok: 1, bad: [Number.NaN] })).toThrow('non-finite number at $.bad[0]');
});

test('digestCanonical is stable across member order', () => {
	expect(digestCanonical({ version: 'v1', rules: ['a'] })).toBe(digestCanonical({ rules: ['a'], version: 'v1' }));
	expect(digestCanonical({})).toBe('sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a');
});
