# TaskPane
The full task record in the right pane: intent, acceptance list, allowed paths, dependencies with supersession, every attempt.
The head keeps owner, state and attempt count visible while the body scrolls. Every attempt stays listed, the current one marked, the rest historical.
## Do
- State scope as the allowed path list, exactly.
- Keep a failed attempt visible once a later one succeeds.
## Do not
- Do not open as an overlay; the pane replaces its column.
- Do not let an edit widen scope while a run holds a lease.
