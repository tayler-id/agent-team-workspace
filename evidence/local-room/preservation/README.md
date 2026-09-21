# React work preservation checkpoint

This is an inventory, not qualification or a runnable local-room delivery. The inherited implementation is preserved before transformation, as required by the local-room brief. No passing test, red-before-green history, PostgreSQL persistence or browser verification is asserted here.

## Starting revision and scope

The relaunch found branch `fm/agora-react-engineering-fixture` already checked out at `4323c85`. Both the physical working directory and Git top-level resolved to the isolated task worktree. No new branch, stash, reset, force operation or source rewrite was needed. The steering inbox had no pending message files at inspection.

Qualified local `main` was `421f572b02aa5bcf9fd235afe28de92004b59f96`, whose latest commit records U01a milestone qualification. Rebase follows this checkpoint, not the other way around.

## Inherited files

| Paths | Observed responsibility | Delivery limitation |
| --- | --- | --- |
| `apps/web/src/store.ts`, `projection.ts` | Immutable client-core store, subscriptions, bounded transcript, message/status projections | Reusable renderer boundary; no transport or durable storage |
| `apps/web/src/components/` | Room shell, timeline, composer, fixture controls, static answer/run/task/evidence/approval cards | Manual fixture controls; no real conversation service |
| `apps/web/src/fixture/adapter.ts`, `driver.ts`, `room.json` | Validate fixture wire inputs and synthesize snapshots, events and receipts | In-memory simulation only; not production conversation contracts |
| `apps/web/test/` | 17 authored tests across adapter, projection and React components | Existence is not a test pass or a retained red-before-green receipt |
| `apps/web/verify/` | Playwright browser script, axe checks and bounded performance scenarios | Not executed on this relaunch; uses Playwright directly, not the required browser operations route |
| `apps/web/src/main.tsx`, `fixture.css`, `index.html`, package and Vite/TypeScript/Vitest configuration | Browser entry, engineering presentation, build/test wiring | Visual design remains owned by the design team |
| Root `.gitignore`, `eslint.config.js`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vitest.config.ts` | Workspace wiring for the partial React fixture | Must reconcile with current main without replacing its newer foundation commands |

There are 22 new authored web files (1,859 raw lines), plus six modified root files. The 18 web TypeScript/TSX/CSS/HTML files alone contain 1,413 raw lines, 1,327 nonblank lines and 1,301 nonblank lines excluding standalone `//` comments. This conservative code count excludes all JSON, the lockfile and all modified root files, yet already exceeds R11's 1,000-line publication block. Root lockfile changes remain visible: 532 additions and two deletions.

Ignored `apps/web/dist/`, existing `node_modules/`, and seven screenshots in `.scratch/web-verify/` remain untouched on disk. Build artifacts and scratch screenshots are not committed as qualification evidence. The screenshots have no complete accompanying report in that directory. No existing uncommitted source or configuration file was discarded.

## Gap to the requested local room

The composer calls the in-memory driver. The driver fabricates the command receipt and message event, so refresh loses user messages and another context cannot observe them. The displayed center answer is static fixture data. There is no minimal durable conversation schema, public room transport, persistent development lifecycle command, deterministic bounded response service, or local-room CLI. The client core should remain the projection/replay/deduplication/retry authority while those missing capabilities are implemented behind replaceable boundaries.

No feature-map, atlas, verification-skill or two-track documentation entry claims this work is Built. R11 requires an approved size split before expanding and publishing the preserved work. The preservation commit is a safety checkpoint only, not a landing candidate.
