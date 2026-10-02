# Mandatory local checks, gate evidence

Task `agora-local-checks`. Scope is the local gate only, not any product milestone.

| File | What it shows |
| --- | --- |
| `red.log`, `green.log`, `test-patch.diff` | The behavioral test file run against the parent, which has no tool (red), then at the head (green), from `scripts/record-red-green.mjs`. |
| `guard-negatives.log` | `guard-negatives.py` breaks nine guards in the tool one at a time. Every mutation turns the tests red, and the file is restored afterwards. |
| `landing-route.log` | The unmodified `fm-merge-local.sh` refusing a landing with no receipt and with a stale receipt after an amend, then landing once the exact head has one. |

The receipt for the final head of the branch lives in the git directory, not the tree, so it
cannot change the commit it describes. `node scripts/local-checks.mjs verify HEAD` reads it.

Host note. The machine's default Node is 24.16.0 and the doctor pins 24.21.0, so the full
run used an official 24.21.0 binary from nodejs.org placed first on PATH.
