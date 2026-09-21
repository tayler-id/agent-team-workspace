# StateBadge

A state chip: a small tinted pill carrying a word and a 14px glyph. Five tints, one meaning each.

| Chip | Fill and ink | Means |
| --- | --- | --- |
| live | `live-tint` / `signal-live`, with a pulsing dot for running | Happening right now: running, awaiting an answer, a countdown |
| pass | `pass-tint` / `mark-pass` | A verdict of pass, or a positive delta |
| fail | `fail-tint` / `mark-fail` | A verdict of fail, or a negative delta |
| neutral | `surface-selected` / `ink` | Everything current or unknown that is not live |
| hist | `surface-inset` / `ink-secondary` | History. Superseded attempts, archived rooms |

Unknown, unconfirmed, lost and unavailable are neutral chips with the question glyph. They are not quieter than a terminal state and they never spin. Missing proof is a visible outcome.

## Do

- Pair every glyph with a word. The dot on running is the one glyph that is a shape rather than a stroke.
- Name times and reason codes inside the chip: "Waiting for your answer · 8 min", "Failed · doctor_failed".
- Keep the chip at least 24px tall.

## Do not

- Do not use an agent tint on a chip. Identity and state never share a colour.
- Do not put a live chip on queued, preparing or verifying.
- Do not shorten "Succeeded · evidence ready" to "Done".
