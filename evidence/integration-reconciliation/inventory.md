# Agora integration reconciliation inventory

Recorded against local main `c04f5606df49eb7976ad5cf244911c73f77dd1fb` (`docs(ci): bind PostgreSQL wrapper atlas to inspected proof`).
Task branch: `fm/agora-integration-reconciliation`.
All source branches below are preserved; none were reset, force-deleted, rewritten, or discarded.

## Classification

| Branch | Tip | Ahead | Behind | Class | Notes |
| --- | --- | ---: | ---: | --- | --- |
| `fm/agora-app-architecture-boundaries` | `d5f12a7` | 16 | 0 | product implementation (architecture lint) | residual-fix evidence head |
| `fm/agora-app-architecture-docs` | `51f22f2` | 3 | 0 | documentation/evidence | architecture specification prose |
| `fm/agora-browser-pretext-virtualization` | `c3d0d72` | 14 | 18 | documentation/evidence (planning only) | planning checkpoint only |
| `fm/agora-ci-guardrails` | `0b80491` | 2 | 18 | CI/tooling | P0a design-negative sandbox |
| `fm/agora-ci-postgres-fixture` | `17fbf24` | 0 | 8 | CI/tooling (on main) | socket atlas snapshot |
| `fm/agora-ci-postgres-fixture-integration` | `c04f560` | 0 | 0 | CI/tooling (on main) | wrapper atlas on main tip |
| `fm/agora-ci-postgres-fixture-proof` | `b122ac6` | 10 | 0 | CI/tooling | P0c-C qualification candidate |
| `fm/agora-ci-toolchain-doctor` | `83029a3` | 4 | 18 | CI/tooling | P0b doctor harness |
| `fm/agora-design-team-handoff` | `57b9db6` | 0 | 54 | historical (on main) | design handoff |
| `fm/agora-local-room-agent-core` | `d4750ba` | 7 | 18 | product implementation (L5 core, stacked on L2) | local answer pure core |
| `fm/agora-local-room-contracts` | `1c5d897` | 0 | 19 | product implementation L1 (on main) | L1 contracts |
| `fm/agora-local-room-contracts-review` | `95f3527` | 0 | 18 | product implementation L1 (on main) | L1 review corrections |
| `fm/agora-local-room-persistence` | `55269a5` | 3 | 18 | product implementation (L2) | **first slice source** |
| `fm/agora-local-room-runtime` | `6e3863a` | 10 | 18 | product implementation (L3, stacked on L2) | not landable before L2 |
| `fm/agora-local-room-web-shell` | `60bcd79` | 13 | 18 | product implementation (L4 shell candidate) | fixture shell |
| `fm/agora-milestone-u01a` | `421f572` | 0 | 21 | historical (on main) | U01a qualification |
| `fm/agora-react-engineering-fixture` | `99aa4f7` | 2 | 21 | preservation source | oversized checkpoint; do not land |
| `fm/agora-s1-bootstrap-repository` | `aaedd8d` | 0 | 64 | historical (on main) | bootstrap |
| `fm/agora-s1-enforce-test-first` | `b9c65c4` | 0 | 22 | historical (on main) | test-first |
| `fm/agora-s1-isolate-client-core` | `a2641fd` | 0 | 40 | historical (on main) | client-core stack |
| `fm/agora-s1-isolate-client-core-1-contracts` | `66013ee` | 0 | 51 | historical (on main) | contracts subslice |
| `fm/agora-s1-isolate-client-core-2-core` | `6151f40` | 0 | 48 | historical (on main) | core subslice |
| `fm/agora-s1-isolate-client-core-3-boundaries` | `a2641fd` | 0 | 40 | historical (on main) | boundaries subslice |
| `fm/agora-s1-isolate-client-core-pre-refresh` | `e292c79` | 12 | 57 | historical | pre-refresh stack |
| `fm/agora-s1-isolate-development` | `2fd3aad` | 8 | 21 | product/tooling (U01b, review-paused) | project controls |
| `fm/agora-s1-publish-portable-contracts` | `606cba2` | 0 | 57 | historical (on main) | contracts stack |
| `fm/agora-s1-publish-portable-contracts-1-harness` | `f3de111` | 0 | 61 | historical (on main) | harness subslice |
| `fm/agora-s1-publish-portable-contracts-2-contracts` | `e1250b5` | 0 | 59 | historical (on main) | contracts subslice |
| `fm/agora-s1-publish-portable-contracts-3-conformance` | `606cba2` | 0 | 57 | historical (on main) | conformance subslice |
| `fm/agora-visual-progress` | `4323c85` | 0 | 29 | historical (on main) | visual progress |
| `fm/agora-visual-progress-1-site` | `d68203a` | 0 | 33 | historical (on main) | site subslice |
| `fm/agora-web-framework-client-host` | `7d29380` | 5 | 8 | product implementation (web Client/Host) | framework package |

## Mergeability analysis (product candidates)

### Already on main

- **local-room L1** (`fm/agora-local-room-contracts`, `fm/agora-local-room-contracts-review`): contracts schema, domain port baseline, center unsupported adapter, probe scenarios. Not a candidate for re-landing.
- Historical S1 / visual-progress / design-handoff / P0c A+B fixture branches: ancestors of main.

### Independently mergeable product implementation

1. **local-room L2 persistence** (`fm/agora-local-room-persistence` @ `55269a5`, code `d2e2131`)
   - Declared prerequisite: L1 on main `95f3527` (satisfied; main advanced to `c04f560` with P0c only).
   - Product files do not overlap main's P0c edits; conflicts are docs/skill/feature-map/atlas only.
   - Independently complete: migration, domain port, storage adapter, center wiring, pg tests, probe scenarios, evidence.
   - **Selected as first integration slice.**
2. **app-architecture-boundaries** (`fm/agora-app-architecture-boundaries` @ `d5f12a7`)
   - Based on current main tip (ahead 16, behind 0).
   - Mechanical lint/renderer policy; reserves `apps/web` owners. Independent of local-room L2.
   - Hold for later ordered landing; not the first local-room product slice.

### Stacked / not independently landable yet

1. **local-room L3 runtime** (`fm/agora-local-room-runtime` @ `6e3863a`): stacked on L2 `55269a5`. Status self-declares not landable before L2. Requires L2 first.
2. **local-room L5 agent-core** (`fm/agora-local-room-agent-core` @ `d4750ba`): stacked on L2, pure local-answer core. Not landable before L2; final L5 also wants browser path.
3. **local-room web-shell** (`fm/agora-local-room-web-shell` @ `60bcd79`): L4 UI candidate on L1 base; fixture transport, not full L3 lifecycle. Needs rebase onto post-L2/L3 main and architecture owners.
4. **web-framework-client-host** (`fm/agora-web-framework-client-host` @ `7d29380`): Client/Host package extracted from shell work; behind main 8; coordinate with architecture-boundaries owner table.

### Documentation / evidence / preservation / CI (not first product slice)

- `fm/agora-app-architecture-docs`: specification prose only ("Planned, not implemented").
- `fm/agora-browser-pretext-virtualization`: planning checkpoint only.
- `fm/agora-react-engineering-fixture`: oversized preservation source; approved as non-landing ancestor.
- `fm/agora-ci-guardrails`, `fm/agora-ci-toolchain-doctor`: behind main; rebase later.
- `fm/agora-ci-postgres-fixture-proof`: P0c-C qualification on current main; CI stream, separate from local-room product.
- `fm/agora-s1-isolate-development`: U01b controls candidate; paused for review; not local-room L2.

## Dependency-ordered integration plan

| Order | Slice | Source branch | Gate before landing |
| ---: | --- | --- | --- |
| 0 | local-room L1 | already on main | done |
| **1** | **local-room L2 persistence** | **`fm/agora-local-room-persistence`** | **this task: cherry-pick onto `c04f560`, focused + full check** |
| 2 | local-room L3 runtime | `fm/agora-local-room-runtime` | after L2 on main |
| 3a | app-architecture-docs (optional prelude) | `fm/agora-app-architecture-docs` | docs-only; can precede or pair with 3b |
| 3b | app-architecture-boundaries | `fm/agora-app-architecture-boundaries` | independent of L2; prefer with web owner needs |
| 4 | web-framework Client/Host | `fm/agora-web-framework-client-host` | after architecture owners exist or reconcile entrypoints |
| 5 | local-room L4 web shell | `fm/agora-local-room-web-shell` | after L3 public transport + framework |
| 6 | local-room L5 agent-core | `fm/agora-local-room-agent-core` | after L2 minimum; full L5 after L4 |
| parallel | CI P0c-C, P0a, P0b doctor | `fm/agora-ci-postgres-fixture-proof`, guardrails, doctor | separate CI stream; do not block L2 product files |
| hold | U01b isolate-development | `fm/agora-s1-isolate-development` | review + rebase |
| never-land as product | react-engineering-fixture, browser virtualization plan | preservation / planning | keep as recovery records |

## First slice preparation record

- Source branch: `fm/agora-local-room-persistence` (preserved, unchanged)
- Source commits: `ff52775` (design checkpoint) -> `d2e2131` (code) -> `55269a5` (evidence)
- Integration method: cherry-pick onto `fm/agora-integration-reconciliation` at main `c04f5606df49eb7976ad5cf244911c73f77dd1fb` without modifying the source branch
- Conflict policy: keep authoritative main P0c skill/runbook text; add L2 feature-map entry, docs, and verify-agora L2 predicates
- Rebased code head: `bc27cff7731082982245fa54944fd4ddea6f49cb`
- Cherry-picked evidence head (pre-binding refresh): `bc46f4d0add07235136c0c810a9971fc1e5f137f`
- Integration parent (current main): `c04f5606df49eb7976ad5cf244911c73f77dd1fb`
- Original source parent: `95f35277fbfc821be148029521222f0de617d7de`
- Original source code head: `d2e213153ce0ac8b0ec7309f68ac2e1509273875`
- Not started here: L3+, architecture, web, CI streams
