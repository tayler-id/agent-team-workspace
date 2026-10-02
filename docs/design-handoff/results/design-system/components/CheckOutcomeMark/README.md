# CheckOutcomeMark

One row per check: a neutral chip carrying a green or red dot for a verdict, or a dash or question glyph for blocked, unavailable and infrastructure error; the check name in mono; the outcome; required or optional.
A check outcome is exactly one of five. Skipped and neutral do not exist, so a check that produced no verdict still has a row at full weight.

## Do not

- Do not colour a blocked or unavailable row.
- Do not summarise as "4 of 5 passed" without the rows.
