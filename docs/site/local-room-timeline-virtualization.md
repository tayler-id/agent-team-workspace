# Timeline virtualization

## What it is

The room shell's message list mounts only the rows near the viewport instead of the whole room. `apps/web/src/components/Timeline.tsx` renders a pure view over `apps/web/src/framework/useTimelineVirtualizer.ts`, which wraps `@tanstack/react-virtual` and a text-measurement engine (`@chenglou/pretext` where Canvas 2D and `Intl.Segmenter` exist, a deterministic character-count fallback elsewhere). It replaces the earlier fixed-size paging window (`Load older messages`, a 50-row `limit`) that `apps/web/src/components/App.tsx` used before this slice.

## What it does

Each row's height is estimated from its text before it mounts, and corrected once a real text row is measured, so scroll position stays stable as the room grows to tens of thousands of messages. The focused row, an active text selection and the keyboard-active row are pinned into the mounted range so keyboard roving, deep links and selection never lose their target to unmounting. A resize or a font-loading event re-reads geometry and keeps the same row anchored under the viewport. Reduced-motion and reconnect-appended messages (`FixtureControls`'s `Append 100 messages`) both skip or follow the scroll position correctly: an append never moves a viewport parked mid-list, and only follows when the viewport was already at the end.

## Why it exists

`docs/technical-spec.md`'s 50,000-message behavior and reconnect-anchor requirements cannot be met by mounting every row; a fixed-size page window (the prior `Load older messages` control) does not scale to that volume either, and cannot keep an out-of-window focused or selected row alive. `apps/web/src/framework/` is the reserved local owner for logic that needs both raw React effects and raw DOM globals in the same place (`scripts/renderer-policy.ts`'s Host/framework exemption) — exactly this component's tight coupling between the virtualizer instance, scroll refs and geometry effects — while keeping `apps/web/src/components/Timeline.tsx` a declarative, effect-free render function, and `@tanstack/react-virtual` behind the single adapter file `scripts/boundary-policy.ts` names (`VIRTUALIZER_ADAPTER`), the same pattern already used for Pretext (`TEXT_SIZING_ADAPTER`).

## How it works

```flow
Row sizing | apps/web/src/rows.ts classifies each row (text vs. measured: tombstone, citations, code) and estimates text rows from apps/web/src/host/{text-sizing,pretext}.ts; a measured real row calibrates the fixed per-row chrome once per geometry.
Virtualizer | apps/web/src/framework/useTimelineVirtualizer.ts owns the @tanstack/react-virtual instance, scroll/list refs, geometry effects, anchor-preserving remeasure and keyboard navigation; it is the one file allowed to import react-virtual.
Pinning | The active row, a selection's endpoints and the focus target are pinned into the mounted range via a custom rangeExtractor, so they mount even when scrolled past the viewport plus overscan.
Render | apps/web/src/components/Timeline.tsx maps the hook's plain view-model (items, totalSize, active index, sizer kind) to absolutely positioned <li> rows; MessageRow subscribes to its own message reference through useClientSelector so unrelated updates do not re-commit it.
```

## Implementation status

**In progress: ported from the preserved source copy onto the current consolidated `App.tsx`, local candidate only.** `docs/technical-spec.md`'s 50,000-message mount-count bound, reconnect-anchor and reduced-motion behavior are proven by `apps/web/test/timeline.test.tsx` in the source copy in isolation (see `evidence/local-room/virtualization/salvage-inventory.md`'s reproduction result); that file, and its `apps/web/test/geometry.ts` jsdom double, are ported in the current shape (`apps/web/test/app.test.tsx`'s virtualized-large-room assertions) but the full keyboard/resize/font/multilingual/RTL/reduced-motion matrix from `timeline.test.tsx` itself is a later slice, tracked in `evidence/local-room/virtualization/salvage-inventory.md`. No real-server integration, final visual design or service/worker change is in scope.

## Verification and proof

Inspect [the virtualizer hook](repo:apps/web/src/framework/useTimelineVirtualizer.ts), [the render component](repo:apps/web/src/components/Timeline.tsx), [row sizing](repo:apps/web/src/rows.ts) and [the text-sizing host adapters](repo:apps/web/src/host/text-sizing.ts). Behavioral coverage lives in [shell tests](repo:apps/web/test/app.test.tsx) (virtualized large-room mount-count bound, keyboard roving) and [sizing tests](repo:apps/web/test/sizing.test.ts). Run `pnpm web:test` for unit and component coverage and `pnpm web:dev` for the live fixture with `Load large room (400)` / `Append 100 messages`. The full per-file source mapping, dependency-ordered slice plan and reproduction of the reported timeline/reconnect issue (found not to reproduce against the preserved implementation; see that document) are recorded in [evidence/local-room/virtualization/salvage-inventory.md](repo:evidence/local-room/virtualization/salvage-inventory.md).

Next: [local room web shell](local-room-web-shell.md).
