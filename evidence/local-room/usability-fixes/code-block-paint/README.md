# Code-block paint bug: fix options for a design decision

Follow-up to `agora-narrow-code-block-diagnosis/report.md`. That report reproduced a blank
code block at desktop widths and proposed `white-space: pre-wrap` as one option, without
confirming whether a structural (non-wrap) fix was possible. This pass tried to find one and
could not, so it stops here for a decision rather than landing `pre-wrap` unannounced, per
this task's brief.

## Setup

Reproduced against the real `apps/web` dev server (`pnpm --filter @agora/web dev`, port
4174) with Playwright driving real Chromium (not the DOM-only static reconstruction the
original report also tried). Chromium binaries were already cached from the prior diagnosis
session, so no extra download was needed. `playwright`/`pngjs` were added as scratch
devDependencies to build the harness and reverted (`pnpm remove -D -w playwright pngjs`,
lockfile restored with `git checkout -- pnpm-lock.yaml`) before this commit; they are not
part of the deliverable. Objective measure: screenshot the code element and count non-background
pixels (`r,g,b < 200`, since the block's background is `rgb(243,243,246)`); a working render
of the fixture's line reads ~2600-2900 "dark" pixels, a blank one reads ~0-60 (antialiasing
noise only).

## What was ruled out

- **Not GPU/compositor tiling.** Re-ran the repro with `--use-gl=swiftshader` (forces
  software rasterization, no GPU tile cache): still blank. Paint invalidation is shared
  between the GPU and software paths in Chromium, so this doesn't fully clear "paint
  invalidation bug" as a category, but it does rule out any fix aimed at GPU layer promotion
  specifically (`will-change`, `translateZ(0)`, `contain: paint`, `isolation: isolate` — all
  tested individually on the `<pre>`, all still blank).
- **Not about `<pre>`'s own rendered width crossing a threshold**, despite what the prior
  report's table suggested. Forcing `.message pre { width: 300px !important }` at a 1440px
  viewport (well under the ~394px threshold the prior report measured) **stayed blank**. The
  correlation with viewport width in that report's sweep was real but not causal in the way
  it implied.
- **Not fixed by moving the horizontal-scroll clip off `<pre>`.** The natural next idea:
  wrap `<pre>` in a `<div class="code-scroll">` that owns `overflow-x: auto`, and let `<pre>`
  itself size to its content (`width: max-content; min-width: 100%`) with `overflow-x:
  visible`, so `<pre>` never establishes its own scrollable-overflow region. Tried this as a
  real source change (`Timeline.tsx` + `fixture.css`, not a runtime override) and swept all
  nine widths from the original report's table, 5 repeated trials each at 570px and 1440px:
  **deterministically blank at every non-mobile width, every trial.** An early manual test of
  this idea looked like it worked, but that was because the test script built the wrapper by
  moving the live `<pre>` node with `insertBefore`/`appendChild` *after* first paint — DOM
  reparenting is a strong forced layout/paint invalidation in its own right and was masking
  the bug, not fixing it. Retested the same reparent as a deliberate isolated step (no CSS
  change) and confirmed reparenting alone, with the original `overflow-x: auto`-on-`<pre>`
  CSS, does **not** fix it either — so it wasn't the CSS restructuring that "worked" the
  first time, it was an incidental forced-repaint artifact of the test harness. Also tried:
  `display: none` → reflow → `display: block` toggle (no effect, matches the prior report),
  `cloneNode(true)` + `replaceWith` (no effect).
- **The one reliable variable found in either diagnosis pass is still `white-space:
  pre-wrap`** (eliminating the single unbroken text run, not just relocating who clips it).
  Verified as a real source change (not a runtime override) with a full width sweep,
  1440px down to 320px: stable ~2907-2908 dark pixels at every width, every trial.

## Why this needs a decision, not a silent fix

This task's brief does not authorize landing `white-space: pre-wrap` as the only fix if it
changes long-code-line behavior, because it does: today a long unwrapped line scrolls
horizontally inside its own box; under `pre-wrap` it wraps and the message card grows
taller instead. Every structural alternative tried above reproduces the exact same blank
result, so — unlike the prior report, which left this open — this pass found no way to keep
today's horizontal-scroll behavior and also fix the paint bug.

## Options for the captain

1. **Ship `white-space: pre-wrap`.** Proven reliable across every width tested, in both
   diagnosis passes. Removes the pre-existing awkward horizontal-scroll-inside-vertical-scroll
   nesting as a side effect. Tradeoff: long lines wrap instead of scrolling sideways.
2. **Hold the fix, file as a tracked known issue.** Needs a non-scripted Chromium session
   (Layers/Paint-flashing panel, single-stepping layout) to find the actual paint-invalidation
   mechanism, which this harness cannot drive. Code blocks stay unreadable at most desktop
   widths in the meantime.
3. **Something in between** (e.g. wrap only past a line-length threshold, or truncate with a
   "show more" control instead of scrolling) — not evaluated here; would need its own design
   pass and wasn't cheap to test blind against a bug this unpredictable.

No source changes are included in this commit; the working tree matches `main` plus this
document. `fm/agora-code-block-paint-fix` needs a captain decision on the above before a fix
lands.
