# StateBadge

A state chip: a neutral `surface-inset` pill carrying the word in `ink` and one 8px dot or a 14px glyph. Chips never take a coloured fill. Five kinds, one meaning each.

| Chip | Dot or glyph | Means |
| --- | --- | --- |
| live | `signal-live` violet dot, pulsing for running | Happening right now: running, awaiting an answer, a countdown |
| pass | `mark-pass` green dot | A verdict of pass, or a positive delta |
| fail | `mark-fail` red dot | A verdict of fail, or a negative delta |
| neutral | grey glyph in `ink-secondary` | Everything current or unknown that is not live |
| hist | grey glyph, word in `ink-secondary` | History. Superseded attempts, archived rooms |

Unknown, unconfirmed, lost and unavailable are neutral chips with the question glyph. They are not quieter than a terminal state and they never spin. Missing proof is a visible outcome.

## Do

- Pair every glyph with a word. The dot on running is the one glyph that is a shape rather than a stroke.
- Name times and reason codes inside the chip: "Waiting for your answer · 8 min", "Failed · doctor_failed".
- Keep the chip at least 24px tall.

## Do not

- Do not use an agent tint on a chip. Identity and state never share a colour.
- Do not put a live chip on queued, preparing or verifying.
- Do not shorten "Succeeded · evidence ready" to "Done".
