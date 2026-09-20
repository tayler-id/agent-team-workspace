# Agora contributor guide

This repository currently contains the design baseline and official project-local pstack skills, not an application.

- Read `docs/technical-spec.md` for authoritative behavior and boundaries.
- Use `docs/implementation-plan.md` for delivery units and `docs/task-breakdown.md` for dependency-aware tasks. Only S1 belongs in the first-release queue.
- Read `docs/research-basis.md` for evidence and `docs/decisions.tsv` for the append-only decision trail.
- R21 owns language-neutral contracts and import boundaries. R22 owns mandatory test-first, guard-negative, feature-map and foundation gates. No product feature or write-enabled agent precedes the executable foundation; each task closes on its own proof, not its unfinished milestone.
- Use the official skills under `.agents/skills/`. R22 overrides the bundled TDD skill's optional-test fallback and model-specific lane assumptions. Preserve all installer bytes and metadata; do not run setup-pstack implicitly.
- Run `node scripts/verify-design.mjs` and `node scripts/test-design-checks.mjs` for authoritative design checks. Run the unchanged pstack plan checker as an informational format check. `docs/validation/design-validation.md` records commands and limits; design validation is not runtime foundation readiness.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
