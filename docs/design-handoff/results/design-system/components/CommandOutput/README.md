# CommandOutput

One registered command: ID, argv already redacted of secrets, exit code, duration, a bounded slice of output with a visible truncation marker. Copy and open artifact are the actions.
A reader must tell "nothing printed" from "output cut" from "output never arrived". Horizontal scroll stays inside the box.

## Do not

- Do not show a secret, even partly.
- Do not colour lines by severity; the exit chip carries the verdict.
