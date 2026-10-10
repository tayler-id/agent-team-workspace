# Replay corpus probe (U01d.B01 / R23, FB-4)

Locally executable replay predicate. It is not full U01d qualification: no React production build, no browser, no R23 laptop measurement.

- Corpus `agora.replay-corpus/v1`, seed `6221057` (`0x5eed01`). Final code commit `a230471ef6cfa56e47b179e62170fdbe1111dc7b`, based on `main` at `f69619f`. Node 24.21.0 (official build).
- Input: 200-message snapshot, then 1000 missed events (replay pages of 50, each shuffled, each re-sending the previous page's last entry) and 100 newly arriving events delivered first, each twice. 1219 inputs after the snapshot. Bodies are 1200 to 4096 scalars of code fences, Markdown tables, lists and Unicode.
- Result at the final commit (`report-1.json` to `report-3.json`): outcome `pass` three times, 1300 messages, 1300 unique, 0 duplicates, order converged, acknowledgements strictly increasing and ending at 1300, observed 39.3, 37.9 and 39.5 ms against the 2000 ms budget. The budget was not relaxed.
- Per-commit red and green (`red.log`, `green.log`, `manifest.json`, from `scripts/record-red-green.mjs`, parent `1f823a4`, head `a230471`). The parent's probe checked only duplicate ids and the budget. A core with duplicate suppression removed halts in resync at 254 of 1300 messages with no duplicate ids, so that predicate passed it, and the head's negative test failed with `expected +0 to be 1` (1 failed, 5 passed, no failed suites). That is a behavioral red: the predicate accepted a core that does not converge. At the head all 6 tests pass.
- Isolated negative (`negative.log`, `negative.sh.txt`): a copy of the real `packages/client-core/src/index.ts` with only the duplicate-suppression guard replaced by `false` reports `fail` (mode resync, 254 messages). The pristine copy and a copy restored from the source file (byte-identical, sha256 `44c187b4...fb6`) both pass. `replay.test.ts` runs the same negative on every run.
- The first commit `1f823a4` adds the corpus and the weaker probe with no test, so it has no red and none is claimed.

## Coverage limits

Exercised: snapshot, visible message events at revision 1, gap buffering, duplicate and re-sent copies, out-of-order replay pages. Unavailable, never invented and never counted as a pass: thread, edit, tombstone and run-card shapes. Timing is the pure client-core transition cost on this host; it excludes HTTP, JSON parsing and rendering.
