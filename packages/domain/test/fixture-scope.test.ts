import { expect, test } from 'vitest';
import { asScopeId, decideFixtureScopeAccess } from '@agora/domain';

const a = asScopeId('11111111-1111-4111-8111-111111111111');
const b = asScopeId('22222222-2222-4222-8222-222222222222');

test('an actor may touch a subject in its own scope', () => {
	expect(decideFixtureScopeAccess({ scopeId: a }, { scopeId: a })).toEqual({ decision: 'allow' });
});

test('an actor is denied a subject in another scope with a stable reason code', () => {
	expect(decideFixtureScopeAccess({ scopeId: a }, { scopeId: b })).toEqual({ decision: 'deny', reason_code: 'scope_mismatch' });
});

test('asScopeId normalizes case and rejects non-UUID text', () => {
	expect(asScopeId('AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA')).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
	expect(() => asScopeId('not-a-uuid')).toThrow('ScopeId must be an RFC 9562 UUID');
});
