# Checking a project

## What it is

An engineer can now run Agora's small verification application and a separate Python example through the same controls. These are **non-production foundation fixtures**, not your team's rooms or projects. They demonstrate the verification contract before Agora can run real tasks.

## What it does

The controls check prerequisites, list available scenarios, start isolated instances, drive their actual behavior, collect proof and stop them safely. The demonstration sends one permitted and one denied scope decision, then checks the saved records and object bytes. Both applications must agree on those literal results.

## Why it exists

“Tests passed” is not enough if the test used somebody else's database or its evidence disappeared during cleanup. A named instance and preserved proof let a reviewer distinguish an observed result from a claim, and let you stop one check without breaking another.

## How it works

```flow
Check readiness | Doctor explains missing local prerequisites; nothing is installed or started implicitly.
Choose and start | Scenarios lists supported checks; start returns a fresh instance, allocated address and cleanup handle.
Observe and retain | Verify drives the real application; evidence checks the saved bytes against this code and these instructions.
Stop safely | Present the instance's own handle; its database and processes disappear while evidence remains available.
```

Use [the CLI reference](cli.md#owned-project-controls) and the [engineer's literal recipe](repo:.agents/skills/verify-agora/SKILL.md). A failed, blocked or unavailable result is not a pass. Changing code or instructions requires fresh verification. An unknown scenario, another instance's cleanup handle or missing artifact is refused. Nothing here grants permission to publish, merge or run an agent.

## Implementation status

**In progress pending independent task review.** Two fixture implementations and owned controls are present. There is no customer onboarding, hosted verification UI or production project execution yet. U01b's general evidence validation and independent trusted checks remain separate future tasks; finishing this capability does not finish that milestone.

## Verification and proof

The [task tests](repo:packages/verification/test/project.test.ts) check both applications, two concurrent instances and refusal cases. The [retained red assertion](repo:evidence/U01b/agora-s1-isolate-development/assertion-red.log) records the earlier absence honestly. [Operator details](project-controls.md) explain namespaces, cleanup, exact receipts and the limits of local owner-attested proof. Independent review must inspect the committed code and receipts before the atlas can call the task complete.
