# Source map

Where each part of this packet comes from. Links are relative to the repository so they work in a checkout and on the future documentation site. The packet's base revision is recorded in `manifest.json`.

## Authoritative sources

| Source | Owns | Used by |
| --- | --- | --- |
| [Technical specification](../technical-spec.md) | Product behavior, contracts, states, authority, security, accessibility budgets | Every packet file |
| [Implementation plan](../implementation-plan.md) | Delivery order, units U01a to U19, per-unit review gates | Product brief, release-stage map |
| [Task breakdown](../task-breakdown.md) | Individual tasks, their gates and evidence paths | Product brief status table |
| [Decision trail](../decisions.tsv) | Append-only record of choices and their reasons | Product brief, design assignment |
| [Research basis](../research-basis.md) | Architecture selection, public evidence ledger, limits | Product brief, visual maps |
| [Contributor guide](../../AGENTS.md) | Repository rules, gates, evidence conventions | Design assignment |
| [Design validation](../validation/design-validation.md) | Which document checks run and what they prove | Design assignment |
| [Development runbook](../runbooks/development.md) | Commands, package boundaries, contract layout | Source of the built-status claims |
| [Wire contracts, OpenAPI](../../contracts/openapi.json) and [schema families](../../contracts/schemas/) | The only authored wire sources; generated TypeScript and Swift consumers follow | Interaction and state, content design (reason codes, CLI outcomes) |
| [Feature map](../../agora/feature-map.json) | Landed features, their paths, public drivers and scenarios | Product brief status table |
| [Verification skill](../../.agents/skills/verify-agora/SKILL.md) | Literal Doctor, Launch, Drive, Evidence and Cleanup commands for the foundation | Product brief status table |
| [Landed evidence](../../evidence/) | Red/green receipts, gate negatives, reviews for each landed task | Product brief status table |
| [Center service](../../apps/center/) and [storage](../../packages/storage/) | The code that exists today | Product brief status table |
| [Packet check](../../scripts/verify-design-handoff.mjs) and [its tests](../../scripts/test-design-handoff-checks.mjs) | Required sections, links, diagrams, stage labels, private paths, size | Design assignment |

Requirement IDs (R01 to R24), acceptance criteria (AC00 to AC32), unit IDs (U01a to U19), and state names in this packet are the spec's own identifiers. Use them when you refer to a behavior so a maintainer can find the sentence that owns it.

## Research archive

Eleven research and review reports informed this synthesis: the agent-team architecture, landscape, and product-definition studies, the chat-center research, the architecture deep dive, the pattern audit, the Jev study, the precedent archaeology, the follow-up research, and two independent specification reviews. The [research basis](../research-basis.md#research-coverage) lists what each contributed. Their private storage locations and operational mechanics are deliberately not part of this packet, and none of them is required reading to use it.

The archive changed four things in this packet. The ledger-room direction and the flat-versus-raised rule come from the precedents' insistence that chat and authority never mix; the run board question in the design assignment comes from a disagreement between two reports; the comprehension test comes from one of the specification reviews; and the warnings not to advertise "your agent" or general research in S1 come from both reviews.
