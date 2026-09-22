# fm/agora-app-architecture-docs integration mapping

Task branch: `fm/agora-architecture-docs-integrate`. Merge parent (main before integration): `ec0bba4` (see `git log` for the exact merge commit this evidence sits under). Source branch: `fm/agora-app-architecture-docs`, tip `51f22f2`, base `c04f5606df49eb7976ad5cf244911c73f77dd1fb`. Source branch and its original tip are untouched; this is a real merge commit, not a rebase or cherry-pick.

The source branch was rebased onto an older main (`c04f560`) before local-room L3 (D93) and the application-architecture-boundaries B1/B2a/B2b work (D84-D89) landed. Both its decision numbering and its own `app-architecture.md` page collided with that later work.

## Unique source paths and disposition

| Source path | Disposition | Rationale |
| --- | --- | --- |
| `docs/technical-spec.md` R25/R26 sections, AC16/AC27/AC33, S1-S3 table rows | Integrated (clean auto-merge) | New requirements not present on main; no collision |
| `docs/implementation-plan.md` U20-U25 | Integrated (clean auto-merge) | Fills a gap: main already had `evidence/U20/` and a `U20.B01` feature-map owner but no unit definition in this file |
| `docs/task-breakdown.md` U20-U25 tasks | Integrated (clean auto-merge) | Same gap as above |
| `docs/research-basis.md` Agora application architecture provenance, client-language review | Integrated (clean auto-merge) | New content, no collision |
| `docs/site/authorization.md`, `docs/site/introduction.md`, `docs/site/concepts.md`, `docs/site/handoff.md`, `docs/site/repository.md`, `docs/site/architecture.md` | Integrated (clean auto-merge) | Additive edits, no collision |
| `docs/site/app-architecture.md` (candidate's planned R25 Feature/Entrypoint/Timeline Card/Client/Host page) | Relocated to `docs/site/agora-application-architecture.md` | Same path on main already holds the already-built, already-linked B1/B2a/B2b import-boundary/renderer-footgun page (D84-D89); that page documents landed, verified functionality and stays. The candidate's page is real, unique, unimplemented-spec documentation and is kept, at a new path, with its stale "not implemented" claims corrected to note U20 is now built |
| `scripts/test-naming-guard.mjs`, `scripts/verify-design.mjs` Dune-ban and inventory additions | Integrated (clean auto-merge / `package.json` conflict resolved to keep both branches' script additions) | New verification policy, no collision |
| `agora/feature-map.json` `agora-application-architecture` entry (owner `U20`, minimal fixtures, page `app-architecture.md`) | Superseded, not revived | Main's `application-architecture-boundaries` entry (owner `U20.B01`) already documents the same landed U20 boundary lint with its real fixtures; the candidate's entry was a placeholder for work that has since actually landed under a different, more complete entry |
| `docs/decisions.tsv` D81-D95 | Renumbered D94-D108 | Collided with already-landed local-room L3/architecture-boundaries decisions also numbered D81-D93 (D93 itself records the same renumbering precedent for an earlier collision) |
| `docs/site/atlas.json`, `docs/site/site.json`, `docs/site/progress.md` entries for the architecture page | Split into two entries: `app-architecture` (kept, Built, main's page) and `agora-application-architecture` (new, Planned, candidate's relocated page) | Both are real; neither supersedes the other post-relocation |
| `docs/site/test/corpus.test.ts` page count | Updated to 30 (main's 29 + the 1 relocated page) | Mechanical count fix after adding the new page |
| `evidence/docs/agora-app-architecture-docs/*` (outcome.json, docs-check.log, full-check.log, naming-guard.log, plan-check.log, verify-design.log, pre-existing-test-design-checks.log) | Integrated unmodified as historical receipts | These are the source task's own receipts, captured against its own commit; left byte-identical rather than rewritten to match post-merge decision numbers or paths, matching the precedent in D93/D94/D95 of never retroactively editing another task's evidence logs |

## What is NOT integrated

- No new architectural design, policy expansion, or visual redesign was authored here; the relocation and decision renumbering are conflict-resolution bookkeeping only.
- `docs/site/app-architecture.md` (main's boundaries page) is unchanged in substance; it only gained a closing cross-link to the relocated page.
