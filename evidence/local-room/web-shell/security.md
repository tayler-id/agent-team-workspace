# Local room web shell security notes

code_head: ee5659d0168254d26b1ded5a8fc3d983338e30ca
recorded_at: 2026-09-20T21:20:00Z

## Risk floor

R1: bounded browser behavior over local, development-only fixture bytes. No dependency with a known advisory, credential, migration, production identity, model call, upload path, search path, task authority or hosted transport is added.

## Findings

- `pnpm audit --json` at this head: 0 vulnerabilities across 344 dependencies (`audit.json`).
- Credential-pattern scan (`git grep` for AWS access keys, PEM private-key headers, Slack, GitHub and Google API key literal signatures) over `apps/web`: zero matches.
- `git remote -v`: no remote configured; nothing was pushed, no PR was opened, no merge was made.
- No `dangerouslySetInnerHTML`, `eval` or `new Function` anywhere in `apps/web/src`. Message bodies render through `projection.ts`'s `segments()`, which splits on code fences and returns plain text/code strings; React escapes every text node it renders, so a message body can never become markup, an attribute or a script.
- The development fixture (`apps/web/src/fixture/room.json`) is validated by the same Ajv 2020-12 wire validator as the rest of the repository (`createWireValidator`, no coercion, defaults or removal) before any byte reaches `@agora/client-core`; malformed or extra-field fixture bytes are refused, not silently accepted (`adapter.test.ts`).
- The shell opens no network connection of its own: `FixtureTransport` only dispatches locally-held fixture bytes into the in-memory client-core store. There is no `fetch`, `WebSocket` or `XMLHttpRequest` anywhere under `apps/web/src`.
- `@agora/contracts`'s main entry no longer imports `node:crypto` at module scope (`contracts/src/index.ts`); this closes a class of Node-only-binding leaks into any future browser bundle, not only this one.
- Destructive git operations during this task were limited to the recorder's own throwaway `git worktree add/remove` pairs (pruned afterwards) and the deliberate, restored isolation-bug commit pair used for red/green evidence; no `git checkout`/`reset`/`clean` ran against tracked uncommitted work.
- Preservation commits `4a77a8f` and `99aa4f7` were inspected read-only and are not ancestors of this branch. Thirteen lines of standard Vite/TypeScript/Vitest boilerplate config (`apps/web/tsconfig.json`, `vite.config.ts`, `vitest.config.ts`) carry over byte-for-byte, matching the brief's "carry over only the smallest suitable React/Vite package configuration"; every other file is hand-adapted against this branch's own contracts and transport port, not mechanically copied. `evidence/local-room/web-shell/preservation-inventory.md` lists every path and its diff size against the preservation commit.
- **Correction:** `eslint.config.js`'s `agora/import-boundary`/`agora/public-types` rule block matched only `apps/*/src/**/*.ts`, not `.tsx`, so every React component under `apps/web/src/components` (`.tsx` files) received zero boundary enforcement from first commit until this fix. The glob now reads `apps/*/src/**/*.tsx` too. Proven, not assumed: a forbidden `@agora/storage` import was injected into `App.tsx` and used, `pnpm lint` failed with `client imports a server package agora/import-boundary`, the file was restored byte-identical to its committed version (`diff` confirmed), and `pnpm lint` passed again. No forbidden import existed in the actual committed `.tsx` files at any point; this closes an enforcement gap, not an exploited one.
