# Preservation inventory for local-room L1

Read-only inspection of preservation commit `4a77a8f1bd947668e20fa8276475f56a6ae8ec9f` ("chore: preserve inherited React engineering work before local-room integration") from qualified local main `421f572b02aa5bcf9fd235afe28de92004b59f96`. Neither `4a77a8f` nor `99aa4f7` is an ancestor of this branch (`git merge-base --is-ancestor` reports no for both). No cherry-pick, merge, checkout of its files or stash was used; the only commands were `git show --stat`, `git show <commit> -- <root files>` and `git show <commit>:apps/web/package.json`.

## What the commit changes at the root

| File | Change in `4a77a8f` | Needed by L1? | Carried |
| --- | --- | --- | --- |
| `.gitignore` | adds `apps/web/dist/` | no, L1 adds no web build | 0 bytes |
| `eslint.config.js` | adds `apps/*/src/**/*.tsx` to the boundary-rule file set | no, L1 adds no `.tsx` | 0 bytes |
| `package.json` | extends `typecheck` with two `apps/web` tsconfigs; adds `web:dev`, `web:build`, `web:verify`; adds `--project web` to `test:unit` | no, L1 adds no package | 0 bytes |
| `tsconfig.json` | excludes `apps/web` from the root compile | no | 0 bytes |
| `vitest.config.ts` | adds `./apps/web/vitest.config.ts` as a project | no | 0 bytes |
| `pnpm-lock.yaml` | +534 lines for React 19.3.0, Vite 8.3.0, jsdom, Playwright, Testing Library, axe-core | no, L1 adds no dependency | 0 bytes |

Everything else in the commit is under `apps/web/` (18 source files, one 406-line fixture, its own package, Vite and Vitest configuration) or `evidence/local-room/preservation/`.

## Decision

L1 carries zero bytes from the preservation commit. The split proposal asks each slice to "reuse existing web dependency/configuration work rather than reselecting the stack"; L1 selects nothing, because it authors contracts, a domain port, one center route and tests, all inside packages that already exist. The lockfile is unchanged on this branch (`git diff 421f572 -- pnpm-lock.yaml` is empty). L4 is the first slice that needs the React, Vite and browser-test dependencies, and it should carry exactly the `apps/web/package.json` dependency block and the four root configuration hunks tabulated above, with this table as its starting inventory.
