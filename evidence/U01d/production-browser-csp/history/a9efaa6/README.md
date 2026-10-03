# Receipts at the pre-rebase head a9efaa6

These files were recorded before the fix was rebased. The fix head was `a9efaa673278a6cb2dc9c18cd453daf11c337077` on base `a62662e8788a072289b14b82f80cc970e1bd6943`. On this branch the same fix is `1111c95` on base `15619b1`, and `git patch-id --stable` gives `48fd4083…` for both diffs. The bytes are unchanged from commit `dd71769`. The move to this folder is the only change, plus one relative link in `browser/README.md`.

`manifest.json` is signed with the owner's `.scratch/producer.key`. It validates only for its own revisions, and only where that key exists:

```sh
node scripts/validate-evidence.mjs --dir evidence/U01d/production-browser-csp/history/a9efaa6 --head a9efaa673278a6cb2dc9c18cd453daf11c337077 --base a62662e8788a072289b14b82f80cc970e1bd6943
```

No branch or tag contains `a9efaa6`, so `git gc` can remove that commit. The validator compares revision strings and does not need the commit object.

The replacement receipt for the rebased head is recorded in the owner's checkout, which holds the key, and lands in the parent folder without touching this one:

```sh
node scripts/record-red-green.mjs --parent 15619b12595f06fa5a4f966472acb634a07060b7 --head 1111c95203e97eb3bda0a04956480b1a1f0a8388 --out evidence/U01d/production-browser-csp -- pnpm --filter @agora/web exec vitest run --config vitest.config.ts test/built-room.test.ts
node scripts/validate-evidence.mjs --dir evidence/U01d/production-browser-csp --head 1111c95203e97eb3bda0a04956480b1a1f0a8388 --base 15619b12595f06fa5a4f966472acb634a07060b7
```
