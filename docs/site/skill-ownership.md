# One maintained skill source

## What it is

Agora keeps its project skills in `.agents/skills/`. The project-owned verification recipe is [verify-agora](repo:.agents/skills/verify-agora/SKILL.md). Installed upstream skills retain their original content and metadata.

## What it does

Claude reaches each skill through a relative directory symlink under `.claude/skills/`. Those pointers resolve to the same canonical files instead of maintaining another copy. Pi's project discovery uses the canonical skills directory. The retired root `skills/` and unused agent-integration directories are not installation targets.

## Why it exists

Independent copies drift and leave agents following old recipes. A single source makes an intended project-owned correction visible through the required compatibility route without rewriting vendored methodology.

## How it works

```flow
Canonical source | Keep installed skills and the Agora recipe under .agents/skills/.
Claude compatibility | Resolve each .claude/skills/<name> pointer to that canonical directory.
Verification | Check pointer identity, retained configuration and absence of retired copies.
Maintenance | Change the project-owned recipe, not the upstream generator's examples.
```

The `.cursor/skills/verify-*` examples in the unchanged upstream creation and maintenance skills describe their generic output convention. They are not Agora's operative recipe or a reason to create a second feature map. Agora's stronger R22 contract uses [the existing JSON feature map](repo:agora/feature-map.json) and its literal verification recipe.

## Implementation status

This is repository/operator configuration, not an application feature, full foundation qualification or proof of every fresh agent runtime. The regression driver checks physical compatibility pointers. Loader discovery must also be observed in the runtime being used; a path resolving correctly alone does not prove discovery.

Historical installer inventory and old evidence retain the paths they actually observed. They are historical records, not instructions to restore retired directories. Canonical upstream bytes, Git history, hooks, CI configuration and active resources stay intact.

## Verification and proof

Run `pnpm exec vitest run --project unit packages/verification/test/skills-layout.test.ts`. It requires every compatibility entry to be a symlink to the matching canonical skill, identical bytes through that pointer, no retired integration roots, and retained Git/tool configuration. Applying this test to the pre-consolidation tree must fail on the materialized copies, not a missing test runner.

Then execute [verify-agora](repo:.agents/skills/verify-agora/SKILL.md), retain its outputs outside runtime roots, and run the exact-commit [local checks](local-checks.md). Passing these configuration assertions is not browser usability or product-release acceptance.
