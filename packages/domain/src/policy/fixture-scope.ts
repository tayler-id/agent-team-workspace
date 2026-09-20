import { digestCanonical, type Digest } from '@agora/contracts';

export type ScopeId = string & { readonly ScopeId: unique symbol };

// Any RFC 9562 textual UUID, including nil and max; identifiers are opaque (R05). Same shape as the contract schema pattern.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function asScopeId(value: string): ScopeId {
	if (!UUID.test(value)) throw new TypeError('ScopeId must be an RFC 9562 UUID');
	return value.toLowerCase() as ScopeId;
}

export const FIXTURE_POLICY = {
	version: 'agora.fixture-policy/v1',
	rule: 'actor.scope_id must equal subject.scope_id',
} as const;

export const FIXTURE_POLICY_DIGEST: Digest = digestCanonical(FIXTURE_POLICY);

export type FixtureDecision = { decision: 'allow' } | { decision: 'deny'; reason_code: 'scope_mismatch' };

// Pure decision over scope only. The storage fixture enforces the same rule with row-level security.
export function decideFixtureScopeAccess(actor: { scopeId: ScopeId }, subject: { scopeId: ScopeId }): FixtureDecision {
	return actor.scopeId === subject.scopeId ? { decision: 'allow' } : { decision: 'deny', reason_code: 'scope_mismatch' };
}
