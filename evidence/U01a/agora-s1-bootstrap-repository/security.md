# Security findings for agora-s1-bootstrap-repository at 84a9243c435909a8c15c4d4a89b1e6ace9d22107

Risk class under R11: R2. The change adds dependencies, a migration, a public contract schema and verification policy. No authentication, secrets, billing or release path exists yet.

## Findings

| Id | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| S1 | Info | The throwaway test cluster uses `--auth=trust`. | Accepted for local tests only. After the first review the cluster listens on a Unix socket in a private temp directory and opens no TCP port (skill-run.log records zero TCP listeners), so only the same user can reach it, for the life of one command. Reuse of an existing server requires explicit URLs with their own credentials. |
| S2 | Info | Roles are cluster-level. Migration 0000 no longer creates any role (the guarded `CREATE ROLE` could not run under a NOCREATEROLE owner); it grants to `agora_app` and blocks with exit 2 when that role is missing. | Operators create `agora_app` and `agora_owner` before the first migration, as the runbook states; the test cluster creates them before migrating. |
| S3 | Low, fixed | Row-level security was enabled but not forced, so the table owner bypassed the policies, and the test cluster's owner was the bootstrap superuser. | Fixed in 597740c: FORCE ROW LEVEL SECURITY on every fixture table, policies for every role, a non-superuser owner in the test cluster, and a dedicated BYPASSRLS role for the guard negative only. The migrate test asserts the service and owner roles are neither superuser nor BYPASSRLS. |
| S4 | Low | The center does not yet enforce the R07 128 KiB control-body limit or rate limits. | Out of this task's scope. The fixture command schema rejects any unknown field, so oversized bodies fail validation, but the bytes are still read. Tracked for the contracts and API tasks. |
| S5 | Info | Scope binding uses `set_config('agora.scope_id', $2, true)` with a bound parameter and transaction-local semantics. | Tested: a connection without a bound scope reads zero rows. A rollback failure now releases the client with the error so pg discards the connection instead of returning an open transaction to the pool (first-review finding, fixed in db88adf). |
| S6 | Medium, fixed | A foreign scope could attach an event to another scope's stream: the foreign-key trigger bypasses RLS and `WITH CHECK` only pinned the inserter's `scope_id`. | Fixed in db88adf with scoped keys `(scope_id, stream_id)`, `(scope_id, stream_id, seq)`, `(scope_id, subject_id)` and a composite foreign key. The forge now fails with 23503 and is asserted in fixture.pg.test.ts; the same change removes the cross-scope existence oracle on global ids. |
| S7 | Medium, fixed | Schema-valid input reached an unhandled exception: ajv-formats' `uuid` accepted the nil UUID and `urn:uuid:` prefixes while the domain parser required version and variant nibbles, so the route answered 500. | Fixed in db88adf: one anchored pattern in the contract and the same shape in `asScopeId`. Asserted for nil, uppercase and `urn:uuid:` inputs. |
| S8 | Info | Error responses carry a `reason_code` and a random `correlation_id`, never stack traces or secret values. Validation details echo JSON Schema paths only. | Compliant with R07. |
| S10 | Medium, fixed | Event replay sorted by a text alias, so a consumer past nine events received a wrong order. | Fixed in 597740c, pinned by a twelve-event test and guard negative 7. |
| S9 | Info | No secret, token or credential is committed. The center reads `AGORA_DATABASE_URL` and `PORT`; the migration CLI reads `AGORA_MIGRATION_DATABASE_URL`. | Verified with a case-insensitive `git grep` for password, secret and token at head; the only matches are inside vendored skill documentation under the installer trees. |

## Not in scope

No model call, worker, upload, email, GitHub or browser surface exists at this head, so their threat rows in R16 remain unexercised.
