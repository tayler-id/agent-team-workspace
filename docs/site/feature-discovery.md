# Feature discovery

## What it is

Build-time discovery of Agora Features, the U21.B01 slice of the R25 application architecture. A Feature is a folder that owns one product capability. Discovery finds those folders by convention and writes one generated file, `agora/feature-inventory.json`, listing them. Nothing registers a Feature by hand.

The reserved shape is fixed here. Roots are `src/features/<name>/` inside each package under `apps/*` and `packages/*`, or `features/<name>/` at the package root when the package has no `src/`. `<name>` is lowercase kebab, matching `^[a-z][a-z0-9-]*$`. Three filenames are reserved inside a Feature folder.

- `entrypoint.ts` is required.
- `timeline-card.tsx` is optional.
- `dependencies.json` is optional and holds a JSON array of Feature names.

The architecture docs call these filenames illustrative. This slice fixed the minimum consistent shape from [the technical specification](repo:docs/technical-spec.md) R25 and [the application architecture page](agora-application-architecture.md), so later units extend one set of names instead of inventing a second.

## What it does

`node scripts/feature-inventory.ts` walks the roots, validates every Feature and writes the inventory. Each row has `package`, `name`, `root`, `entrypoint`, `timelineCard` (a path or `null`) and `dependencies`. Rows sort by package, then name. The file carries `schema_version` `agora.feature-inventory/v1` and a sha256 digest of the rows. A second run changes nothing and reports the same digest.

`node scripts/feature-inventory.ts --check` regenerates in memory and exits 1 when anything is wrong. The package scripts `pnpm features:generate` and `pnpm features:check` wrap the two commands.

Discovery rejects four kinds of input, and each message names the supported owner and the conventional path.

- A reserved file, or a `features` directory, outside the conventional path.
- A Feature folder with no `entrypoint.ts`.
- An invalid name, or two names that collide when compared case-insensitively.
- An inventory that differs from what the tree produces, including a hand edit.

`dependencies.json` is read only so its names land in the inventory. Discovery does not check that they resolve and does not restrict imports between Features.

## Why it exists

R25 says a Feature is found, not registered. A registry file drifts from the tree, and a hand-written list lets a Feature exist without an entrypoint. Generating the inventory from the folder convention makes the tree the single source, and the check makes a stale or edited inventory a failing command. Later units, such as the Client and Host boundary, read the inventory instead of globbing on their own.

## How it works

```flow
Walk | For each package under apps/* and packages/*, read src/features/ (or features/ when the package has no src/).
Validate | Check each folder name against ^[a-z][a-z0-9-]*$, reject case-insensitive duplicates, and require entrypoint.ts.
Reject strays | Fail on a reserved file or a features directory anywhere outside the conventional path, naming the owner and the expected path.
Record | Read the optional timeline-card.tsx and dependencies.json, sort rows by package then name, and add a sha256 digest.
Write or check | Default mode writes agora/feature-inventory.json. --check recomputes it and exits 1 on any difference.
```

The inventory is output only. Editing it by hand turns `--check` red, and the fix is to rerun the generator. The check and the generator share one discovery module, so they cannot disagree about what counts as a Feature.

## Implementation status

**Built for U21.B01 only.** `apps/web/src/features/room` and `apps/web/src/features/notes` were empty placeholder folders and each now holds a stub `entrypoint.ts` so the inventory has real rows. No product code moved into them. This slice does not migrate real product Features, does not enforce Feature-to-Feature imports (the separate declarations slice owns that), and does not qualify U21. Live lanes, the performance probe and exact-head receipts remain open.

## Verification and proof

Inspect [the discovery module](repo:scripts/feature-discovery.ts), [the inventory CLI](repo:scripts/feature-inventory.ts), [its tests](repo:scripts/test/feature-discovery.test.ts) and [the generated inventory](repo:agora/feature-inventory.json). Run `pnpm features:check`. The tests cover a well-formed Feature, a misplaced path, a missing entrypoint, a duplicate name, drift on a hand-edited inventory, a guard-disabled run that turns the drift assertion red, and an idempotent regenerate. [verify-agora](repo:.agents/skills/verify-agora/SKILL.md) holds the literal setup, drive and cleanup commands, including a disposable-copy negative.

Next: [application architecture boundaries](app-architecture.md) for the U20 import rules, and [the full R25 specification](agora-application-architecture.md) for the units still ahead.
