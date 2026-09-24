# Local selected-message response slice

## Subject and red/green

The implementation subject is `7228d5cbe799c853b6cb012c1b3827fe5f35d211` over baseline `6bb15515f222be42d53fda8d4036f09d4bca1a4d`. The unchanged public test patch is in `red-green/test-patch.diff`. The recorder used `node scripts/with-test-postgres.mjs pnpm exec vitest run --project pg apps/center/test/local-answer.pg.test.ts`. Baseline red: `expected [404, 404] to deeply equal [201, 201]` against the running room. Head green: one passing PostgreSQL runtime test. An initial recorder attempt without the PostgreSQL wrapper produced only a blocked prerequisite and was replaced; it is not the red claim. The native service test covers concurrent duplicate triggers, exact source quote and citation, malformed and unknown selection, changed-command conflict, two independent replay clients, CLI posting, ordinary restart and reload.

## User path and browser observation

1. Start a private local instance with `node scripts/local-room.ts start --instance NAME`.
2. Open its printed URL in browser A and confirm the empty room.
3. Open the same URL in browser B; both see the fixed local room.
4. Send a human message through `node scripts/local-room.ts send --instance NAME --body 'Browser quote <b>literal</b>'`.
5. Confirm the persisted message arrives in both tabs, with literal markup rendered as text.
6. Click **Quote locally** on that human message in browser A.
7. Observe the labelled local-agent message with a clickable `Cited: You` reference in both tabs.
8. Inspect `history` and `replay --after 0` to see the same immutable persisted message and event.
9. Reload either tab; it reconstructs that quoted row and its citation from snapshot. Ordinary stop/start retains it.
10. Retry an explicit `--command-id UUID` from the CLI or HTTP: the same selection returns the same receipt, changed selection conflicts, and no second event appears.

Steps 1-7 and a live browser reload from step 9 were driven with `chrome-devtools-axi` at `http://127.0.0.1:59704/` on two tabs; a post-reload screenshot of browser B is `two-tab.png`. Both tabs showed two rows and the source button became **Quoted locally**; after browser B reloaded it retained two rows, the disabled quoted button and one citation. An earlier browser drive at `http://127.0.0.1:53319/` confirmed literal `<b>` was rendered as text, zero timeline `b` elements and no console messages. Steps 8, 10 and ordinary service restart were asserted with real CLI/HTTP plus two independent replay clients in the PostgreSQL integration test. Both browser instances were stopped and explicitly reset after observation. These receipts prove a first local quoted-response path, not full L5 acceptance, a model provider, an independent exact-head review or the rest of L4.

Validation at the subject: `pnpm test` 234/234 (after installing the locked Python verification requirements); `pnpm web:test` 31/31; `pnpm lint`, `pnpm typecheck`, `pnpm boundaries`, `pnpm contracts:check`, `pnpm contracts:conform -- --json`, `pnpm docs:build` and `pnpm docs:test` passed. Global `pnpm docs:check` remains red on 183 pre-existing markdownlint issues in the separately supplied `docs/design-handoff/results/design-system/` packet; both changed docs pages pass markdownlint individually, and `pnpm docs:validate` passed. The host default `/Applications/Automic Vault/node.app` is Node 24.16.0 and rejects the Rolldown native Team ID; checks were run with unwrapped `/Users/taylerramsay/.local/node/bin/node` (still 24.16.0, below doctor pin 24.21.0). `ci-doctor` therefore remains blocked on the exact pin, not qualified.
