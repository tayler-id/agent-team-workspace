# Late-events-response regression test: coverage-only, not a fix

`node scripts/record-red-green.mjs` reports `"outcome": "fail"` here because `red_exit` is `0`: the
new test (mirroring the existing late-snapshot regression test) passes unmodified at the parent
revision `4e110b0` too. That is expected, not a defect. The generation guard on the events branch of
`poll()` (`apps/web/src/host/live.ts`) already existed before this commit, landed together with the
snapshot-branch guard in `6c2ccd1`; this commit only adds the missing test for the branch that
already had the fix but not its own regression coverage. `green.log` is the same passing run at head
`14c5436`.
