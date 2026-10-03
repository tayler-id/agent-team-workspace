# U22.B01 client state boundary receipts

Head `e6cb6672b07d54ea549248645a41b2b0d7bd045f`, parent `a62662e` (main). Node 24.21.0, pnpm 10.34.1.

- `red.log` runs the new test against the parent, where `agora/client-owner` does not exist. Four of six tests fail. The two acceptance tests (ephemeral state, owner exemptions) pass because the parent accepts everything.
- `green.log` runs the same file at head. All six pass.
- `guard-disabled.log` runs the file at head with `'agora/client-owner': 'off'` in `eslint.config.js`, restored byte for byte afterwards. The same four tests go red, so the rule is what blocks the cases, not an unrelated guard.
- The case accepted on main is a component calling `useState(room)` on a `useClientSelector` value. Linting it at the parent reported only an unrelated `no-meaningless-void-operator` style message and no `agora/*` finding.
- `pnpm lint` found one real bypass in the tree, `App.tsx` calling `transport.saveDraft`. The persist call now lives in `useSetDraft`.
