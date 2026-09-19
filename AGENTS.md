# Agora contributor guide

This repository currently contains the design baseline and official project-local pstack skills, not an application.

- Read `docs/technical-spec.md` for authoritative behavior and boundaries.
- Use `docs/implementation-plan.md` for delivery units and `docs/task-breakdown.md` for dependency-aware tasks. Only S1 belongs in the first-release queue.
- Read `docs/research-basis.md` for evidence and `docs/decisions.tsv` for the append-only decision trail.
- Use the official installed skills under `.agents/skills/`, including architect, technical-writing, show-me-your-work, unslop, and poteto-mode. Preserve installer copies and `skills-lock.json`; do not run setup-pstack implicitly.
- Run `node scripts/verify-design.mjs` and `node .agents/skills/poteto-mode/scripts/check-plan.mjs docs/implementation-plan.md` for design checks. `docs/validation/design-validation.md` records validation scope and limits.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
