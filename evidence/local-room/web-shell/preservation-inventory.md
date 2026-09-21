# Local room web shell: preservation inventory

Preservation commit `4a77a8f1bd947668e20fa8276475f56a6ae8ec9f` and proposal head `99aa4f7`
were inspected read-only, per the brief. Neither is an ancestor of `fm/agora-local-room-web-
shell`. This file records exactly what this branch's `apps/web` reuses from that commit,
file by file, so the "documenting every reused path" requirement has a literal answer instead
of a general assurance.

Method: `diff <(git show 4a77a8f:<path>) <path>` for every `apps/web` path present in both
trees, run at this branch's code head.

## Carried byte-for-byte (0-line diff)

| Path | Lines | Note |
| --- | --- | --- |
| `apps/web/tsconfig.json` | 5 | Standard workspace-package TypeScript config extending the repo base; no project-specific content. |
| `apps/web/vite.config.ts` | 4 | Minimal Vite config: the React plugin and an `es2024` build target. |
| `apps/web/vitest.config.ts` | 4 | Minimal Vitest config: the React plugin, jsdom environment, test glob. |

These three files (13 lines total) are the "smallest suitable React/Vite package
configuration" the brief authorizes carrying over; there is no smaller correct config for
this toolchain, and none of the three contains application, fixture or product logic.

## Substantially rewritten (non-trivial diff against the preservation commit)

| Path | Diff lines vs. `4a77a8f` |
| --- | --- |
| `apps/web/index.html` | 4 |
| `apps/web/package.json` | 8 |
| `apps/web/src/main.tsx` | 14 |
| `apps/web/src/store.ts` | 5 |
| `apps/web/src/projection.ts` | 28 |
| `apps/web/src/components/Composer.tsx` | 37 |
| `apps/web/test/projection.test.ts` | 51 |
| `apps/web/src/components/Timeline.tsx` | 51 |
| `apps/web/src/components/FixtureControls.tsx` | 55 |
| `apps/web/src/fixture.css` | 84 |
| `apps/web/src/fixture/adapter.ts` | 87 |
| `apps/web/src/components/App.tsx` | 122 |
| `apps/web/test/adapter.test.ts` | 141 |
| `apps/web/src/fixture/room.json` | 373 |
| `apps/web/test/app.test.tsx` | 227 |

Every file in this table shares a name and a general responsibility with its preservation-
commit counterpart (the room shell needed a projection, a timeline, a composer, a fixture
adapter, and so on regardless of authorship), but the actual bytes were re-derived against
this branch's own contracts, transport port and test expectations: the narrow
`RoomTransportPort` seam, the wire-validated fixture path through `createWireValidator`, the
roving-tabindex keyboard model, the update-isolation memoization guard, and the gap/resync/
revoked state machine did not exist in this form in the preservation commit and were written
for this branch.

## Not carried at all

| Path in `4a77a8f` | Disposition |
| --- | --- |
| `apps/web/src/components/Cards.tsx` | Not reused; this branch has no card-based layout. |
| `apps/web/src/fixture/driver.ts` | Not reused; replaced by `apps/web/src/fixture/fixtureTransport.ts`, a different shape behind the transport port. |
| `apps/web/verify/run.ts` | Not reused; this branch's verification is `pnpm web:test` plus the real browser pass recorded under `evidence/docs/agora-local-room-web-shell/browser/`, not a bespoke verify script. |
| `apps/web/verify/tsconfig.json` | Not reused (supported only the removed `verify/run.ts`). |

## Root-level preservation bytes, not part of this inventory

`4a77a8f` also touched `.gitignore`, `eslint.config.js`, `package.json`, `pnpm-lock.yaml`,
`tsconfig.json`, `vitest.config.ts` and added `evidence/local-room/preservation/README.md` at
the repository root. This branch's own root-level changes (recorded in
`evidence/local-room/web-shell/size.json`'s `shared_reconciliation` block) were written
independently against current `main` and were not diffed against the preservation commit's
versions of those files, since root configuration is shared repository state, not room-shell
UI bytes the brief asks this inventory to cover.
