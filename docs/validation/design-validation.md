# Design validation

Revalidated on 2026-09-20 after two independent specification reviews. The package remains specification-only. Static design readiness passed; runtime foundation readiness and all product acceptance criteria remain unexecuted.

## Observed results

| Check | Result | Retained evidence |
| --- | --- | --- |
| Project-owned semantic design gate | 24 requirements, 26 live-scenario mappings, 22 milestones, 66 tasks and 66 exactly owned Build outcomes; combined task/milestone graph acyclic | [Design check](design-check.txt) |
| Foundation sequencing | Eight proofs owned by foundation units; all features depend on the full foundation; evidence/trusted checks/scripted canary precede model writes | Design check |
| Later-stage independence | Knowledge, observer, external-agent and native-client tracks have no unjustified cloud dependency | Design check |
| Behavioral validator suite | 23 cases pass, including two valid inputs and 21 rejected mutations | [Validator tests](design-check-tests.txt) |
| Red-before-green regression | Old checker accepted an unrelated task Outcome; repaired checker rejects it. A second regression moved a foundation proof into dependent feature work; the missing ownership guard was observed red, then fixed | [Red/green record](validator-red-green.txt) |
| Unchanged pstack format checker | 22 sections, zero problems. Informational only; the semantic gate also accepts a plan with the literal model name removed | [Plan check](plan-check.txt) |
| Markdown lint | Six authored Markdown files, zero issues | [Markdown check](markdown-check.txt) |
| Bundled pstack script tests | 52 passed, zero failed, 206 assertions | [Bundled tests](pstack-tests.txt) |
| Bundled strict typecheck | Exit zero, no diagnostics | [Bundled typecheck](pstack-typecheck.txt) |
| Upstream preservation | 47 skills, 55 installer trees and canonical 122-file inventory retained; no installer or lockfile diff | [Original inventory](skills-inventory.txt) |
| Append-only trail | Original 43 decision rows remain byte-identical; all later choices append | [Baseline digest](decision-baseline.sha256) |
| Authored checks | Local links/anchors, heading/fence structure, private paths, placeholders, long dashes, canonical contributor pointer, JavaScript syntax and incremental diff whitespace pass | Design check and diff review |
| Dated version evidence | Current supported majors and direct registry engine/peer metadata checked; no application compatibility trial claimed | [Research basis](../research-basis.md#dated-foundation-compatibility-check) |

The 23 validator cases preserve the original style/link/requirement/cycle tests and add missing/unowned/duplicate Build ownership, Outcome mismatch, task self-milestone deadlock, wrong close gate, missing/misplaced foundation proof, missing live coverage, premature model writes, foundation bypass, cloud-coupled memory, and historical decision rewriting. The positive model-neutral case proves the project gate does not depend on the pstack model literal. Each rejection asserts the intended diagnostic, not merely any nonzero exit.

A fixture setup failure after adding script citations to the decision trail was not counted as behavioral red. The test fixture was corrected to include those source files, then the foundation-owner regression failed for the intended acceptance bug. The retained red/green record distinguishes the valid behavior failures from setup errors.

## Reproduction

Run from the repository root:

```sh
node scripts/verify-design.mjs
node scripts/test-design-checks.mjs
node --check scripts/verify-design.mjs
node --check scripts/test-design-checks.mjs
node scripts/verify-design-handoff.mjs
node scripts/test-design-handoff-checks.mjs
node .agents/skills/poteto-mode/scripts/check-plan.mjs docs/implementation-plan.md
npx -y markdownlint-cli2@0.23.2 'AGENTS.md' 'docs/**/*.md'
git diff --check
git diff --cached --check
```

The project gate is authoritative for document semantics only. It cannot infer whether prose is true, a screenshot shows success, or a runtime exists. R22 specifies the future executable foundation runner and its trusted evidence checks. The pstack checker remains unchanged and informational. Its annotations do not require ten model sessions or authorize unavailable tooling.

Negative tests create isolated document/source fixtures under ignored `.scratch/design-check-tests`. They never alter installed metadata or source documents. They preserve the same original decision-prefix digest and deliberately corrupt copies to prove refusal.

The existing upstream tests ran again in a fresh ignored copy:

```sh
mkdir -p .scratch/revision-review
cp -R .agents/skills/poteto-mode/scripts .scratch/revision-review/pstack-tools
cd .scratch/revision-review/pstack-tools
BUN_INSTALL_CACHE_DIR=../bun-cache bun install --frozen-lockfile --ignore-scripts
bun run test
bun run typecheck
```

Use a new ignored destination on repetition. All 20 original bundled script files remained byte-identical in the tested copy. The validation host used Node 24.16.0, Bun 1.3.14, bundled TypeScript 7.0.2 and markdownlint-cli2 0.23.2. These are validation-tool versions, not proof of the future application pins Node 24.21.0, PostgreSQL 18.6 and TypeScript 5.9.3. No runtime or schema-generation matrix was executed here.

## Cross-document review

The revision preserves the local-owner-first task, single PostgreSQL authority, human publication/review/merge boundaries, exact-head evidence, stale-lease recovery and no silent fallback. It adds schema-first multilingual contracts, framework-free synchronization, native human authentication, execution-target distinctions, standalone worker distribution and neutral provider/agent adapters.

The former U01 is split into U01a-U01d. Tasks close independently, with separate milestone integration gates. Every task Outcome exactly matches its single owned Build box. The lease task now owns leases rather than launch UI; launch UI belongs to task ownership. Human decisions and registered-project lifecycle precede their consumers. Generic evidence validation and trusted reporting precede a deterministic real-worker canary, which precedes write-enabled model work. Memory no longer waits for cloud execution.

The selected React client receives ordinary production fitness/accessibility checks, not a comparative Vue bake-off. The research basis records Svelte and the broader alternatives covered by both independent reviews, their contrary conclusions, and why C is not the chosen first implementation. Native Swift and external-agent work now have durable tasks and release criteria. Native macOS managed execution remains unavailable until its distinct runner is qualified.

The revised diff contains documents, validation helpers/evidence and contributor pointers only. No server, browser application, worker implementation, application dependency installation or competing framework prototype was created. The decision trail preserves the original rows, including superseded choices, and appends the revision rationale.

## Coverage limits

No live Agora product, model adapter, external coding agent, native app, cloud sandbox, email flow, GitHub publication, backup restore or performance acceptance scenario ran. Future evidence paths remain unfulfilled. Neither framework performance nor package compatibility was benchmarked. Source checks and the one failed source-extraction route are disclosed in the research basis.

The official installer output remains unchanged. Its 55 existing extra-EOF warnings from the initial installation are retained, not newly introduced or normalized. Upstream examples still contain placeholder syntax, long dashes and links outside the installed subset; authored style/link checks exclude them. No new review agent, push, pull request, merge, deployment or application pipeline ran in this revision.
