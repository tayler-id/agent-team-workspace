# Replay corpus probe (U01d.B01 / R23, FB-4)

Locally executable replay predicate. It is not full U01d qualification: no React production build, no browser, no R23 laptop measurement.

- Corpus `agora.replay-corpus/v1`, seed `6221057` (`0x5eed01`). Candidate code commit `ba8f48bd7c477a8ae3739222425d535cee0e771c`, parent `f69619f`. Node 24.21.0 (official build).
- Input: 200-message snapshot, then 1000 missed events (replay pages of 50, each shuffled, each re-sending the previous page's last entry) and 100 newly arriving events delivered first, each twice. 1219 inputs after the snapshot. Bodies are 1200 to 4096 scalars of code fences, Markdown tables, lists and Unicode.
- Result at the candidate (`report-1.json` to `report-3.json`): outcome `pass` three times, 1300 messages, 1300 unique, 0 duplicates, order converged, acknowledgements strictly increasing and ending at 1300, observed 35.3, 41.6 and 42.7 ms against the 2000 ms budget. The budget was not relaxed.
- Genuine red: `negative.log`, produced by `negative.sh.txt`. A copy of the real `packages/client-core/src/index.ts` with only the duplicate-suppression guard replaced by `false` halts in `resync` at 254 messages and the predicate reports `fail`. The pristine copy and a copy restored from the source file (byte-identical, sha256 `44c187b4...fb6`) both pass. `replay.test.ts` runs the same negative on every run.
- `red.log` and `green.log` come from `scripts/record-red-green.mjs`. Its red run is the parent without the corpus and probe modules, so it fails on a missing import. That is not behavioral proof and is not claimed as such; `negative.log` is.

## Coverage limits

Exercised: snapshot, visible message events at revision 1, gap buffering, duplicate and re-sent copies, out-of-order replay pages. Unavailable, never invented and never counted as a pass: thread, edit, tombstone and run-card shapes. Timing is the pure client-core transition cost on this host; it excludes HTTP, JSON parsing and rendering.
