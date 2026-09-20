# U01a.B04 task proof

## Scope and subject

This is local foundation-fixture proof, not U01a qualification, product readiness, trusted CI, or permission to merge. The behavioral baseline is the test-only parent `fb67e9ce2c6658d672ca6446f524714ec55cbac5`. The implementation first passed at `cfd755a`; each retained receipt and report names its exact full tested revision. Later evidence-only commits do not pretend to have tested themselves. Independent reviewers must run the driver at their chosen committed candidate.

## Behavioral results

`red.log` contains a working baseline operation and the literal failure `AssertionError: expected [] to include 'red_missing'` for `FG01.red-required`. `green.log` passes the same ten subjects. `test-patch.diff` is applied at the exact parent by the existing recorder. The initial native result is also retained in `initial-red.json`. The first attempt through the system launcher could not load Rolldown and was not accepted as red; firstmate supplied the approved local Node PATH, without changing dependencies or signatures.

`guard.json` names the exact source/test digests and one mutation: omit only the red-required check. Normal assertions pass. The weakened copy fails exactly `FG01.red-required`. Lane 9 rejects missing/malformed, stale, unrelated and always-red guard claims against fresh execution. Lane 10 rejects missing and forged red and premature feature admission with specific proof IDs. `task-report.json` records the composed task pass. `foundation-report.json` remains blocked with FG04-FG08 missing and U01a integration unqualified.

`validation.json` records exact argv, revision, times, exits and artifact digests for the literal project checks. The numbered logs include a zero-vulnerability dependency audit, lint/typecheck/docs/site gates, contract drift, independent TypeScript/Swift conformance, client replay, boundaries, all unit and real PostgreSQL tests, HTTP probes, repeat migrations, design negatives and the informational upstream plan checker. The task and foundation check artifacts retain fresh native assertion identities and owner command output, rather than reinterpreting historical owners' claims.

## Performance finding and bounded diagnosis

The original `performance.json` is unchanged. Five interleaved parent/head batches passed the clean-build budget with a 1.0111 p95 ratio, but standalone SwiftPM-backed conformance had a 1.3372 ratio. That is an observed wall-time failure, not a pass hidden by retries. The combined typecheck/build/conformance maximum was 11.75 seconds at parent and 11.57 seconds at head. Validation of a 128-KiB unknown-field input, including JSON parsing, stayed below 0.072 ms p95; no production 128-KiB command is implemented here.

Firstmate authorized one predeclared diagnostic in `performance-diagnostic-plan.md`, not a waiver or replacement sample. Its fifty interleaved samples per revision separately measured prebuilt native work, TypeScript comparison, and SwiftPM launch overhead with identical golden bytes. All conformance verdicts agreed. Product-work p95 was 108.09 ms at parent and 115.28 ms at head, a 1.0666 ratio within 10%. Launch-overhead p95 was 545.46 versus 549.51 ms, a 1.0074 ratio. Native-only and TypeScript-only p95 increases were also below 10%. Both revisions exhibited similar cold native maxima around 210 ms and launcher maxima around 660 ms.

These results disconfirm a repeatable 33.7% consumer regression and show launch variation on the unchanged parent too. They cannot identify which host process caused the original isolated slow sample: the original run did not record stage-level timing. The original aggregate anomaly remains visible for independent review. No implementation or gate was changed to fit timing.

## Security and cleanup

Risk floor is R2 because this change controls verification policy and adds a public report contract. There is no model call, service credential, publication operation, guard-disable CLI flag, production identity or storage service. Fixed argv drives repository-owned commands. Unknown options, unsafe evidence paths, non-ancestor/stale revisions and dirty source deny before replay. A local candidate still executes with the developer's permissions; this is not a sandbox or tamper-proof attestation against a malicious machine. Human review remains required.

The public driver checks tracked source integrity and restores the sole declared mutation before removing its owned copies. PostgreSQL clusters, recorder worktrees, diagnostic worktrees, the loopback documentation server and this task's browser session are removed. Evidence survives. `cleanup.json` records the final checks. Final cleanup found SwiftPM's three owned lock files outside each removed copy; `cleanup-repair/red.log` reproduces that leak and `cleanup-repair/green.log` proves exact-name removal while preserving an adjacent unrelated file. No push, remote action or merge occurred.

## Documentation inspection and remaining authority

The six-section feature page and ordered proof flow were inspected at actual 390x844 and 1440x900 viewports. The retained screenshots show readable wrapping, alignment and the explicit separation between task admission and later authority. Browser assertions found no horizontal overflow, five ordered flow items and no page scripts or animations. Keyboard Tab exposed the visible skip link, and Enter focused the main landmark. This is an accessibility-tree and keyboard inspection, not a claim of an operating-system screen-reader session or a product UI qualification.

The atlas remains In progress and no milestone is marked ready. Independent code, documentation and human landing review are still external to this worker's assertions. Review the committed implementation and these receipts, not this summary alone.
