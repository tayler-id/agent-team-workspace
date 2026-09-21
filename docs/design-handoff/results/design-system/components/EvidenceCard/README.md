# EvidenceCard

The evidence pane in the packet's review order: intent, exact head and base, changed paths with size and risk, each required scenario with its outcome, artifacts, trust class, cleanup, then the diff last.
Owner-attested and verified by CI are different claims, stated in words. Blocked, unavailable and missing scenarios are shown as failures, never hidden. A quarantined or missing artifact fails closed.

## States

Valid; invalid with reason code and consequence; upload pending; quarantined artifact; unavailable check.

## Do not

- Do not render HTML or SVG artifacts inline.
- Do not summarise scenarios as a count without the rows.
