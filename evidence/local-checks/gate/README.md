# Mandatory local checks, gate evidence

Task `agora-local-checks`. Scope is the local gate only, not any product milestone.

| File | What it shows |
| --- | --- |
| `red.log`, `green.log`, `test-patch.diff` | The behavioral test file run against the parent, which has no tool (red), then at the head (green), from `scripts/record-red-green.mjs`. |
| `guard-negatives.log` | `guard-negatives.py` breaks nine guards in the tool one at a time. Every mutation turns the tests red, and the file is restored afterwards. |
| `landing-route.log` | The unmodified `fm-merge-local.sh` refusing a landing with no receipt and with a stale receipt after an amend, then landing once the exact head has one. |
| `blank-line-fix.mjs` | The guarded one-off fix for the first real red the gate found. See below. |

The receipt for the final head of the branch lives in the git directory, not the tree, so it
cannot change the commit it describes. `node scripts/local-checks.mjs verify HEAD` reads it.

Host note. The machine's default Node is 24.16.0 and the doctor pins 24.21.0, so the full
run used an official 24.21.0 binary from nodejs.org placed first on PATH.

## First real red the gate found

The first full run on this branch went red inside `pnpm check`, so the gate did its job.
Main was already failing `pnpm docs:check`. The causes were 187 markdownlint findings in the
supplied design-handoff READMEs (blank lines around headings and lists, one missing H1), 4 in
`evidence/local-room/connection-controls-browser/README.md`, and the docs corpus test pinning 33
pages before this change added one. These blocked the accepted check contract, so this slice fixed
them without loosening any rule. `blank-line-fix.mjs` only inserts blank lines, and writes a file
only after proving in memory that its non-blank lines are unchanged and the findings are gone.
The one content edit is a `# Agora design system` heading on `design-system/README.md`.
