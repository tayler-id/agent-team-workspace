// The three definitions every project check and the evidence validator share. Dependency-free on purpose:
// the validator imports this instead of project-checks.mjs so a start does not compile the wire validator.
import { createHash } from 'node:crypto';
export const exits = { pass: 0, fail: 1, blocked: 2, unavailable: 3, usage_error: 64, infrastructure_failure: 70 };
export const hash = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
export function requireThat(ok, reason, outcome = 'fail') { if (!ok) throw Object.assign(new Error(reason), { outcome }); }
