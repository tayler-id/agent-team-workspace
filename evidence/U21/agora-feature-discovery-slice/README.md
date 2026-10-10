# U21.B01 feature discovery receipts

Task `agora-s1-discover-features` indexes these receipts from [its canonical evidence path](repo:evidence/U21/agora-s1-discover-features/README.md).

`red.log` runs `scripts/test/feature-discovery.test.ts` against the parent, where the discovery module does not exist, and exits 1. `green.log` runs it at the head and exits 0 with 8 passing tests.

Guard negative. The test `guard negative: with the drift comparison disabled the hand-edit assertion turns red` copies the generator into a `agora-u21-*` temp directory, hand-edits a row, confirms `--check` exits 1, replaces the drift comparison with `if (false)`, and confirms `--check` then exits 0. The directory is removed afterward.

Not claimed. U21 live lanes 1 to 10, the perf probe and exact-head qualification are still open. Real product Features are not migrated. Import enforcement belongs to the declarations slice.
