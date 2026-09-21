# Source relationship for the corrected browser-shell candidate

| Ref | SHA | Role |
| --- | --- | --- |
| Candidate base | `95f35277fbfc821be148029521222f0de617d7de` | Local-room L1 review corrections; parent of the web-shell candidate range |
| Candidate head | `60bcd797d3f7817651142d88ced49509ea040447` | Final corrected browser-shell candidate after size/lint/bundle claim fixes |
| Main at rebase | `17fbf24609fb3cbcb25c052ae7ecee124bc0bc87` | Landed P0c-A main this branch rebased onto; no `apps/web` / `packages/web-framework` yet |
| Tested subject | `5f29ec46fc934f6d43db8c5e857db8f216b0ac5b` | Rebased product + pin commits; the revision `pnpm check`, web tests and boundaries were run against |

## Commit range `95f3527..60bcd79` (product candidate only)

```text
60bcd79 docs: record the final exact-head pnpm check gate after the correction commit
746e33d fix: correct false size, lint-boundary and bundle-budget claims
03db2c9 docs: record the final exact-head pnpm check gate for the web shell branch
f9e608c docs: complete local-room web shell evidence with a real browser pass
a3c6889 checkpoint: pause before further browser product code
ee5659d docs: reconcile the corpus page count after rebasing onto local-room L1
ff362e0 fix: ignore apps/web/dist in eslint
d067548 docs: add apps/web to the package boundary table and command list
ccb8106 docs: record measured bundle size and the browser verification pass
34b95a8 fix: keep @agora/contracts' main entry free of node:crypto for browsers
268cdb7 test: retain red/green evidence for the row-memoization guard
aab2c0c fix: stabilize room shell row memoization against unrelated updates
bb62afa test: cover the local room web shell with the isolation guard still red
```

## Replay policy

This branch reapplied product shell behavior from that candidate onto main `17fbf24609fb3cbcb25c052ae7ecee124bc0bc87`, then refactored it into `packages/web-framework` + Host `EnvironmentPort`. It does **not** import the candidate's preservation inventory bulk, browser JPEG set, or outdated evidence claims that assumed the pre-framework layout. P0c-A files and evidence under `evidence/ci/P0c/` are retained unchanged from main.
