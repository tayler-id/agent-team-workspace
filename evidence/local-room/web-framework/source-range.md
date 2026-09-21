# Source relationship for the corrected browser-shell candidate

| Ref | SHA | Role |
| --- | --- | --- |
| Base | `95f35277fbfc821be148029521222f0de617d7de` | Local-room L1 review corrections; parent of the web-shell candidate range |
| Candidate head | `60bcd797...` (full: see `git rev-parse 60bcd79`) | Final corrected browser-shell candidate after size/lint/bundle claim fixes |
| Current main | `2d947dce434db392305d98af5abf3627e1caad2f` | Base + provisional design-handoff results; no `apps/web` |

## Commit range `95f3527..60bcd79` (13 commits)

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

This task reapplies the product shell behavior (room UI, fixture transport, contracts browser-safe barrel, docs/commands) onto current main, then refactors it into `packages/web-framework` + Host `EnvironmentPort`. It does **not** import the candidate's preservation inventory bulk, browser JPEG set, or outdated evidence claims that assumed the pre-framework layout.
60bcd797d3f7817651142d88ced49509ea040447
95f35277fbfc821be148029521222f0de617d7de
2d947dce434db392305d98af5abf3627e1caad2f
