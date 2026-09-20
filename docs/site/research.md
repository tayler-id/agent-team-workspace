# Research and decisions

This index separates shareable repository synthesis from the larger local research archive. Evidence supports a choice; it does not prove a deployed implementation.

## Repository-owned, shareable sources

| Record | Contribution | Limit |
| --- | --- | --- |
| [Research basis](repo:docs/research-basis.md) | Architecture alternatives, independent review synthesis, public evidence ledger and contradictions | Design research, not a benchmark or live deployment |
| [Decisions](repo:docs/decisions.tsv) | Append-only rationale from architecture through foundation implementation | Older decisions can be superseded; read later entries |
| [Technical specification](repo:docs/technical-spec.md) | Authoritative product boundaries, required behavior and release gates | Specified does not mean implemented |
| [Design validation](repo:docs/validation/design-validation.md) | Commands, counts and limits of document checks | Not runtime foundation readiness |
| [Atlas](atlas.md) | Dated implementation snapshot linked to code/tests/evidence | Not a live scheduler or automatic completion authority |

The research synthesis names the contributions of nine original reports and two independent reviews without exposing private storage locations. Those reports are **not bundled here**. Sharing a source report needs explicit review for confidentiality, provenance, permissions and relevance; a summary link is not permission to publish the archive.

## Documentation quality reference

On 2026-09-20, the documentation worker inspected the complete current sidebar corpus at [Noodle](https://poteto.github.io/noodle/) through the approved browser route: landing, introduction, getting started, mental model, all seven concept pages, CLI/configuration/glossary/FAQ and all four cookbook entries.

The useful patterns were a coherent sidebar, progressive explanation before reference, examples with expected results, cross-links, local section navigation, and responsive menu access. Agora adopts those usability principles, not Noodle's product behavior, branding, prose or assets. In particular, Noodle's autonomous merge and memory patterns are not Agora authority policy.

| Reference family | Observed lesson | Agora counterpart |
| --- | --- | --- |
| [Introduction](https://poteto.github.io/noodle/introduction) and [mental model](https://poteto.github.io/noodle/thinking-in-noodle) | Explain why before enumerating settings | [Introduction](introduction.md), [concepts](concepts.md) |
| [Concepts](https://poteto.github.io/noodle/concepts/skills) | One responsibility per page with boundaries | [Architecture](architecture.md), [memory](memory.md), [execution](execution.md) |
| [CLI](https://poteto.github.io/noodle/reference/cli) and [configuration](https://poteto.github.io/noodle/reference/configuration) | Concrete command/field references | [Current and planned CLI](cli.md), [configuration](configuration.md) |
| [Cookbook](https://poteto.github.io/noodle/cookbook/minimal-noodle-loop) | Small runnable recipes with next steps | [Fixture and contract recipes](cookbook.md) |
| [FAQ](https://poteto.github.io/noodle/reference/faq) and [glossary](https://poteto.github.io/noodle/reference/glossary) | Answer real questions without requiring architecture knowledge | [FAQ](faq.md), [glossary](concepts.md#glossary) |

The browser displayed V0.1.5 on the landing page. These pages are undated and may change; the inspection date is not a publication date. Some reference examples used different order field names across pages, a reminder to verify examples against code rather than copy them. This was a documentation-usability inspection, not independent verification of Noodle's implementation.

## More useful visuals, not more decoration

Agora adds a first-class system and milestone atlas, a generated Mermaid companion, plain-language purpose on every component and ordered visual flows on feature pages. Visuals must expose relationships and authority, while remaining legible as text and to assistive technology. [The authoring contract](authoring.md) requires those visuals with future implementations.
