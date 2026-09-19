# Design validation

Validated on 2026-09-19. This is a specification-only package. These results validate the documents and installed planning tools, not an Agora application.

## Observed results

| Check | Result | Retained evidence |
| --- | --- | --- |
| Official pstack plan checker, unchanged | 17 delivery sections, zero problems; ten live lanes specified per section | [Plan check](plan-check.txt) |
| Authored-document consistency | 20 requirements, 20 live-scenario mappings, 17 plan units, 51 unique task slugs; complete requirement/criterion/unit coverage and acyclic prerequisites | [Design check](design-check.txt) |
| Validator negative tests | Baseline accepted; eight broken fixtures rejected, including a dependency cycle, unknown requirement, missing live scenario, broken link, placeholder, long dash, unofficial skill metadata, and missing decision evidence | [Validator tests](design-check-tests.txt) |
| Markdown lint | Six authored Markdown files, zero issues after the documented code-block rule correction | [Markdown check](markdown-check.txt) |
| Bundled pstack script tests | 52 passed, zero failed, 206 assertions across four files | [Bundled tests](pstack-tests.txt) |
| Bundled pstack strict typecheck | Exit zero, no diagnostics | [Bundled typecheck](pstack-typecheck.txt) |
| Installer inventory | 47 official skills, 55 retained installer trees, 122 files in the canonical tree; source and hashes recorded | [Skills inventory](skills-inventory.txt) |
| Authored diff whitespace, local links, headings, fences, private paths, placeholders, and long dashes | Passed; canonical `CLAUDE.md` pointer verified | Design check and authored staged-diff inspection |
| Complete installer-inclusive diff whitespace | 55 upstream warnings, one extra blank line at EOF in each copied `automate-me/SKILL.md`; no authored warning | Upstream bytes retained rather than normalized |

The first Markdown pass flagged tabs in the specification's TypeScript examples. The installed writing/code convention uses tabs there. `.markdownlint.json` therefore exempts code blocks from the hard-tab rule, disables the line-length rule for contract tables, and allows repeated subheadings under different parent sections. Authored prose remains checked. No upstream skill file was changed to satisfy a style check.

## Reproduction

Run from the repository root:

```sh
node scripts/verify-design.mjs
node scripts/test-design-checks.mjs
node .agents/skills/poteto-mode/scripts/check-plan.mjs docs/implementation-plan.md
npx -y markdownlint-cli2@0.23.2 'AGENTS.md' 'docs/**/*.md'
git diff --cached --check -- AGENTS.md CLAUDE.md .gitignore .markdownlint.json docs scripts skills-lock.json
```

The design validator checks authored documents only. It checks local links and anchors, not remote page uptime or the truth of a vendor claim. The negative tests create disposable copies under ignored `.scratch/design-check-tests`; they do not modify source documents or installed metadata.

The upstream script checks ran in a copy so dependency installation could not alter the committed installer output:

```sh
mkdir -p .scratch
cp -R .agents/skills/poteto-mode/scripts .scratch/pstack-tools
cd .scratch/pstack-tools
BUN_INSTALL_CACHE_DIR=../bun-cache bun install --frozen-lockfile --ignore-scripts
bun run test
bun run typecheck
```

Use a fresh ignored copy directory on repetition. A byte comparison verified all 20 original script files remained identical in the tested copy. The observed toolchain was Node 24.16.0, Bun 1.3.14, TypeScript 7.0.2, and markdownlint-cli2 0.23.2. This does not claim Node 22 application compatibility; the application and its lockfiles do not exist yet.

## Cross-document review

The review checked the local-first boundary in every document, inactive S1 project-main identities, separate project grants, all consequential human approvals, exact-head evidence, lost-lease recovery, current-base review, knowledge activation, and later-stage separation.

It caught and resolved authority ambiguities. Required remote CI now gates review-ready and merge after the draft push, rather than deadlocking that push. A separately approved publication now receives a new short-lived effect capability rather than attempting to reuse a terminated execution lease. A project-dedicated checks-only App, not the shared GitHub Actions identity, now authenticates required check publication. U01 also owns the real managed-project fixture and protected repository prerequisites, preventing early worker verification from depending on the later publication broker. These corrections are recorded in the [decision trail](../decisions.tsv).

The reviewed diff contains design documents, validation helpers/evidence, contributor pointers, installer metadata, and the complete official skills. It contains no Agora server, client, worker, deployment, or application dependency implementation. Upstream copies were inspected through their inventory/provenance and the canonical tooling tests, not mistaken for separately implemented products.

## Coverage limits

No live product, browser, model, local worker, sandbox, email, GitHub publication, backup, or performance acceptance scenario ran. No screenshot or video of Agora exists. The plan's unchecked evidence paths are future deliverables. Source rechecks and their limits are recorded in the [research basis](../research-basis.md#public-evidence-ledger).

Upstream skill examples include long dashes, placeholder syntax, and links to files outside the installed subset. They remain unchanged and outside authored style/link checks. No cross-model review or delegated lane ran. No push, pull request, deployment, merge, or application CI pipeline ran. The specification's limits and all AC release gates remain mandatory for future implementation.
