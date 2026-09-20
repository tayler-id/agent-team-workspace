# Independent exact-head review record

Task: agora-s1-bootstrap-repository (U01a.B01). Implementing owner: the crewmate session that authored the branch. Independent reviewer: a separate code-review agent (Claude Opus, code-reviewer profile) with read-only access to the repository and the ability to run the check commands and probe a throwaway cluster. The reviewer is not the implementing owner. The operator's human verdict remains separate and is not claimed here.

## Round 1 at 0645910

Verdict: FAIL (request changes). Exit codes observed by the reviewer: typecheck 0, lint 0, docs:check 0, test 0.

| Finding | Severity | Disposition |
| --- | --- | --- |
| 1. Storage and domain suites failed at collection at the parent (absence), not on a value assertion | Critical (reviewer) | Disagreed in part; see below. Added five guard-disabled negatives and a second value-level red/green round. |
| 2. Nil UUID and `urn:uuid:` reached a 500 | Critical | Fixed in db88adf, red on value first (review-fixes/red.log). |
| 3. Foreign scope could attach an event via the FK | Critical | Fixed in db88adf with scoped keys and a composite FK, red on value first. |
| 4. Throwing rollback masked the error and leaked the client to the pool | Important | Fixed in db88adf and tightened in 597740c: the client is released once, in finally, with the rollback error when the rollback itself failed. Not covered by a test: forcing a rollback failure needs a fault injector this task does not have. |
| 5. Storage exported pg types | Important | Fixed in 3f9aee9 (Database port, FixtureTransaction interface). |
| 6. R11 size target crossed without rationale | Important | Rationale recorded in decisions.tsv D65 and below. |
| 7. Evidence and recorder untracked | Important | Committed in the evidence commit that follows the code head. |
| 8. Probe drove the center as the owner | Important | Fixed in 0bddb62; service role is the default, migrations use AGORA_MIGRATION_DATABASE_URL. |
| 9. Trust auth on TCP; port TOCTOU | Suggestion | Fixed in 0bddb62; socket-only cluster, no port probe. |
| 10. Cross-scope existence oracle on global ids | Suggestion | Fixed in db88adf with scoped keys; asserted. |
| 11. Race test did not force overlap; recorder flag parsing | Suggestion | Fixed: latch in the race test (db88adf), option parsing (0bddb62). |

Position on finding 1. R22 permits absence as red "including a new endpoint returning 404, only after the same driver proves an existing baseline operation and the intended public assertion fails for that absence". In red.log the same run passes the health liveness baseline and fails six public HTTP assertions on literal status codes. The storage suite's parent failure is the same absence class at a non-public boundary, so the storage guards are proven differently: gate-negatives.log disables each guard in turn (stream WITH CHECK, event USING, the counter row lock, the counter's transaction membership, and the schema's unknown-field rejection) and the specific assertion turns red each time at this head. The review round (review-fixes/red.log, parent 3f9aee9) additionally shows the FK forge and the scoped-identifier assertions failing on values. The reviewer's stricter reading is recorded; the merge authority decides whether this satisfies FG01 for the task.

Size rationale (R11). Code commits 84d29c9..84a9243 versus the docs-only parent 9369a01, excluding pnpm-lock.yaml and evidence: see the counts below. The default 200-line, 8-file target is crossed because the Build outcome is the repository bootstrap itself (workspace, strict compiler, lint/type/docs gates, PostgreSQL path, migration mechanism, fixture and its tests). After the review-fix commits the added-line count excluding the lockfile is above the 1,000-line block threshold, so R11 requires either a split or a non-author maintainer's size exception before this change lands; the source-file count stays below 25. The author did not split it because the fixes are corrections to the same fixture and separating them would leave a known-broken intermediate revision on the branch. The evidence commit adds prose, captured logs and the regeneration script only (R0). The decision is the merge authority's; see decisions.tsv D65 and D67.

- Changed files excluding the lockfile: 38; added lines: 1209; deleted lines: 0
- Source files (.ts, .mjs, .sql outside test directories): 17; added lines: 667
- Test files: 7; added lines: 319
- Lockfile (visible, excluded): 2452 lines

## Round 2 at 0bddb62

Verdict: FAIL (one new correctness defect). Exit codes observed by the reviewer: typecheck 0, lint 0, test 0 (27 tests), probe 0. Round-1 items were judged fixed except item 1 (partially, "intent satisfied, letter not; record, don't block"), item 4 (residual double-throw path) and item 7 (evidence committed later by plan).

| Finding | Severity | Disposition |
| --- | --- | --- |
| A. `readEvents` sorted by the text alias, so replay order broke past nine events | Critical | Fixed in 597740c: qualified sort column; a twelve-event test failed on value first (review-fixes/red.log) and pins numeric order. Guard negative 7 in gate-negatives.log turns it red again when the qualifier is removed. |
| B. RLS not forced; no runtime check that the service role is a non-owner | Important | Fixed in 597740c: FORCE ROW LEVEL SECURITY on all three tables and policies for every role. The owner-confined assertion failed first, then passed. The test cluster's owner is now a non-superuser, because the previous owner was the bootstrap superuser and superusers bypass RLS unconditionally; the migrate test asserts both roles are neither superuser nor BYPASSRLS. The guard negative now uses a dedicated BYPASSRLS role. |
| C. Migration creates `agora_app` NOLOGIN with no runbook step | Important | Runbook step added in docs/runbooks/development.md (create a LOGIN member of the group role). |
| D. gate-negatives.log lacked command lines | Suggestion | Each entry now records the command, the expectation, the observed exit and the suite sizes; produced by regenerate.sh. |
| E. Design-check fixture symlinked real evidence/packages | Suggestion | Copies now, node_modules filtered (597740c). |
| F. Race test relies on pg's default pool size | Suggestion | Documented in the test; eight stays below the default of ten. |
| G. release() throwing inside try could double-throw | Suggestion | Release moved to finally (597740c). |

## Round 3 at 597740c

Verdict: pass with findings. Exit codes observed by the reviewer: typecheck 0, lint 0, docs:check 0, test 0 (29 tests), design-check tests 0, probe 0. Round-2 items A, B, C, D and G judged fixed; E and F partially (the `.agents` symlink stays because no case mutates under it; the race test documents rather than enforces the pool size).

| Finding | Severity | Disposition |
| --- | --- | --- |
| 1. The migration's guarded `CREATE ROLE` could not run under the non-superuser owner (NOCREATEROLE), so a fresh database without `agora_app` aborted at statement two | Important | Fixed in 289a524: the block is removed, roles are an operator prerequisite, `runMigrations` checks for the role first and the CLI exits 2 with outcome blocked. migration-prerequisite.log records the blocked run and the successful run after the role is restored. |
| 2. Runbook said policies granted `TO agora_app` apply to members, stale after the policies moved to every role | Suggestion | Runbook rewritten. |
| 3. Probe-URL rewrite in the migrate test could corrupt an unencoded socket host | Suggestion | Fixed in 289a524: the rewrite keeps the scheme and authority prefix and the whole query. |
| 4. Design-check test left 11 MB scratch runs behind | Suggestion | Fixed in 289a524: the run directory is removed on success. |

## Round 4 at 289a524

Verdict: pass with findings. Exit codes observed by the reviewer: typecheck 0, lint 0, docs:check 0, test 0 (29 tests), design-check tests 0, probe 0. Round-3 items 1 to 4 judged fixed; the reviewer confirmed the diff 597740c..289a524 touched only the six expected files, that every evidence file named the head, and that regenerate.sh is a faithful producer of the generated receipts (review.md and security.md are hand-written).

| Finding | Severity | Disposition |
| --- | --- | --- |
| 1. The role preflight had no automated test; deleting it failed nothing | Important | Fixed in 6c3ca74: the cluster exports a superuser URL used by one test to rename the role away, assert the prerequisite error, restore it and migrate. Gate negative 8 deletes the preflight and that test turns red. |
| 2. regenerate.sh's final green line reported grep's exit, not the suite's | Important | Fixed: PIPESTATUS, and a failed restore now aborts the script. |
| 3. `rowCount` may be null in pg's types | Suggestion | Fixed: null-safe comparison. |
| 4. Runbook exit-code list omitted 2 | Suggestion | Fixed. |
| 5. restore() continued silently after a failed restore | Suggestion | Fixed: exits 70. |

## Round 5 at 6c3ca74

Verdict: pass with findings. Exit codes observed by the reviewer: typecheck 0, lint 0, docs:check 0, test 0 (30 tests), design-check tests 0, probe 0. Round-4 items 1, 2, 4 and 5 judged fixed.

| Finding | Severity | Disposition |
| --- | --- | --- |
| 1. The null-safe `rowCount` comparison was not at the head: the gate-negative restore had reverted the uncommitted edit before the commit | Important | Fixed in 84a9243, committed and verified in the diff. |
| 2. The prerequisite test renames a cluster-level role with no repair path if a run aborts | Important | Fixed in 84a9243: the test renames a leftover `agora_app_hidden` back before hiding the role, restores in an inner finally, and closes handles and drops its database in an outer finally. The runbook says the exported-URL path must target a disposable server. |
| 3. Expected applied count hardcoded | Suggestion | Fixed: derived from the journal. |
| 4. URL rewrite dense and uncommented | Suggestion | Extracted to a commented helper shared by both tests. |
| 5. Handle and database leaks on failure | Suggestion | Fixed by the outer finally. |

## Round 6 at 84a9243

Verdict: PASS. Exit codes observed by the reviewer: typecheck 0, lint 0, docs:check 0, test 0 (30 tests), design-check tests 0, probe 0. Round-5 items 1 to 5 judged fixed; the diff 6c3ca74..84a9243 touches only migrate.ts and its test; every evidence file names this head; both green logs show exit 0; the reviewer confirmed the red logs fail on literal values rather than asserting a guard.

| Finding | Severity | Disposition |
| --- | --- | --- |
| 1. On the persistent-server path only, a hard kill between the rename and its restore leaves the role renamed until the next run's third test repairs it, costing one spurious red run | Low | Accepted, not fixed here. The default path is a throwaway cluster that dies with the damage; the runbook restricts the exported-URL path to disposable servers. Moving the repair into `beforeAll` is the follow-up. |
| 2. If closing the blocked database handle throws, the database drop and superuser pool end are skipped | Suggestion | Accepted, not fixed here. |

Closing statement. The task closes on its own declared checks at code head 84a9243 with an independent exact-head PASS. The operator's human verdict and the R11 size decision (D65, D67) remain open for the merge authority.
