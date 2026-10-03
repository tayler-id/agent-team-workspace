# Receipts at the pre-rebase head a9efaa6

These files were recorded before the fix was rebased. The fix head was `a9efaa673278a6cb2dc9c18cd453daf11c337077` on base `a62662e8788a072289b14b82f80cc970e1bd6943`. On this branch the same fix is `1111c95` on base `15619b1`, and `git patch-id --stable` gives `48fd4083…` for both diffs. The bytes are unchanged from commit `dd71769`. The move to this folder is the only change, plus one relative link in `browser/README.md`.

`manifest.json` is signed with the `.scratch/producer.key` of the checkout that recorded it. It validates only for its own revisions, and only with that key. Any other checkout's key gives `producer_signature_invalid`:

```sh
node scripts/validate-evidence.mjs --dir evidence/U01d/production-browser-csp/history/a9efaa6 --head a9efaa673278a6cb2dc9c18cd453daf11c337077 --base a62662e8788a072289b14b82f80cc970e1bd6943 --key PATH/TO/THAT/producer.key
```

No branch or tag contains `a9efaa6`, so `git gc` can remove that commit. The validator compares revision strings and does not need the commit object.

The receipt for the rebased head is in the parent folder. The unchanged recorder made it for `1111c95` on `15619b1` with the package test command from the verify-agora skill, the same command this receipt used, and signed it with the key it generated in that checkout.
