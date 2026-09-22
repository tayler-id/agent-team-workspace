# Browser and accessibility verification — web-framework Client/Host

## Scope

- **Main at rebase:** `17fbf24609fb3cbcb25c052ae7ecee124bc0bc87`
- **Tested product subject:** `5f29ec46fc934f6d43db8c5e857db8f216b0ac5b` (behavior under test; atlas revision)
- **Driver:** `chrome-devtools-axi` against live `pnpm web:dev` at `http://127.0.0.1:4174/`
- Design-handoff previews are not acceptance criteria. Fixture CSS only.

## Live browser pass (this session)

| Check | Method | Result |
| --- | --- | --- |
| Empty state at desktop | `resize 1440 900`, screenshot `01-empty-desktop-1440x900.png` | Pass — status "No Room Loaded", composer disabled |
| Load fixture → live timeline | click "Load fixture snapshot", screenshot `02-live-timeline-desktop-1440x900.png` | Pass — status "Live", message articles present, citations |
| Offline banner | click "Go offline", screenshot `03-offline-desktop.png` | Pass — status "Offline.", composer notes offline send wait |
| Gap phase | click "Skip one event (gap)", screenshot `04-gap-desktop.png` | Pass — "Replaying Gap", "1 buffered after cursor 8" |
| Phone layout | `resize 390 844`, screenshot `05-phone-390x844.png` | Pass — `data-viewport=phone`, `matchMedia('(max-width: 700px)').matches === true`. Observed `window.innerWidth` was **500** after the tool resize (Chrome floor in this session); media query and phone class still applied |
| Keyboard roving | focus last article, `ArrowUp`, screenshot `06-keyboard-focus-desktop.png` | Pass — focus moved `…108` → `…107` with article aria-label |
| Horizontal overflow @ 1440 | `documentElement.scrollWidth === clientWidth` | Pass — `overflowX: false` |
| `prefers-reduced-motion` rule present | CSSOM scan for conditionText | Pass — rule present in loaded stylesheet; live OS preference not toggled |
| Skip link landmark | snapshot | Present — "Skip to messages" |
| Fixture controls labeled | snapshot | Present — development-only region |

## jsdom coverage (same subject, `pnpm web:test`)

Complements the live pass: revoke, upgrade, invalid snapshot alert, draft/Enter/receipt/rate-limit, load-older windowing, citation focus, batched announcement, update-isolation `data-commits` freeze.

## Not claimed

- Exact physical 390 CSS-pixel width (tool reported innerWidth 500 after resize 390).
- Live screen-reader narration.
- Live `prefers-reduced-motion: reduce` OS emulation beyond CSS rule presence.
