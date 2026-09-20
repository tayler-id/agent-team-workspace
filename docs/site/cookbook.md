# Practical guides

These recipes exercise implemented contributor tools. They make no model calls, provision no repositories, and do not launch product tasks.

## Inspect a real policy response

First run the complete HTTP probe:

```sh
node scripts/with-test-postgres.mjs node scripts/probe-center.mjs --json
```

Look for `outcome: pass` and the `policy-deny` scenario with HTTP 200 and `reason_code: scope_mismatch`. A policy denial is an expected successful evaluation. `policy-unknown-field` must be 400, not a stripped or ignored field.

To inspect by hand, start a temporary center in one terminal:

```sh
node scripts/with-test-postgres.mjs node apps/center/src/main.ts
```

In a second terminal, send the following fixed non-production fixture input:

```sh
curl -sS http://127.0.0.1:3000/api/v1/fixture/policy/decisions \
  -H 'Content-Type: application/json' \
  -d '{"schema_version":"agora.fixture-policy-command/v1","actor":{"scope_id":"11111111-1111-4111-8111-111111111111"},"subject":{"scope_id":"22222222-2222-4222-8222-222222222222"}}'
```

Expected: `decision: deny`, `reason_code: scope_mismatch`. Ctrl+C in the first terminal stops the owned command and cluster. Choose a different `PORT` before launch if 3000 is occupied and use that same port in curl. No real user's identity is involved.

## Change a wire contract

1. Add the behavior's golden vector and rejection case first. Capture the intended assertion red with a working driver.
2. Edit the appropriate schema family, not the generated TypeScript or Swift.
3. Run `pnpm contracts:generate`, inspect the generated diff, then `pnpm contracts:check`.
4. Run `pnpm contracts:conform -- --json` and the full affected verification.
5. Update [the contract explanation](contracts.md), visual, [feature map](repo:agora/feature-map.json) and scope proof in the same change.

```flow
Expectation | Freeze literal accepted bytes and denied variants.
Implementation | Keep the common subset explicit.
Proof | Both consumers agree, drift rejects, unavailable remains non-pass.
Documentation | Explain the new boundary and link committed receipts.
```

## Prove migration repeatability

```sh
node scripts/with-test-postgres.mjs bash -c \
  'node packages/storage/src/migrate-cli.ts; node packages/storage/src/migrate-cli.ts'
```

The first result applies one migration; the second applies zero with the same schema digest. This is a disposable test, not a backup or restore drill. Persistent database role setup belongs to the [development runbook](repo:docs/runbooks/development.md).

## Add or revise a feature page

Follow [the authoring contract](authoring.md): explain purpose and boundaries, include a flow, register navigation and a tool home, update only the atlas data owner, and inspect the built page at both viewports. A passing documentation gate is not a substitute for checking the feature's actual code.
