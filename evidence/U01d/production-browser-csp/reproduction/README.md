# Production browser CSP: before-fix reproduction

This folder records the blank production build of the `apps/web` fixture room at parent commit `a62662e`, captured before any fix. It separates three things that show up together.

- Trigger. Ajv generates validator source at runtime and runs it through `Function(...)`. `apps/web/src/host/fixture.ts` calls `createWireValidator()` at module load, and `contracts/src/index.ts` builds an Ajv 2020 instance that compiles on `addSchema`.
- Mask. The build-only CSP meta from `apps/web/vite.config.ts` has `script-src 'self'` with no `'unsafe-eval'`, so the browser refuses that `Function(...)` call.
- Symptom. The refusal throws during evaluation of the single bundle, before `main.tsx` reaches `createRoot` or `renderMountError`, so `#root` stays empty and the page shows nothing but the background color.

Nothing here edits tracked source. The lead commits.

## Setup

- Worktree `/Users/taylerramsay/.treehouse/agent-team-workspace-439a06/2/agent-team-workspace`, branch `fm/agora-production-browser-slice`, HEAD `a62662e`.
- Node 24.21.0 and pnpm 10.34.1 from `.scratch/node/node-v24.21.0-darwin-arm64/bin`, first on `PATH`.
- Browser: `chrome-devtools-axi` with `CHROME_DEVTOOLS_AXI_SESSION=prodslice-before`, stopped at the end. The CLI cuts console output at 2000 characters, so `axi-raw.mjs.txt` calls the same session's bridge (`list_console_messages`, `get_console_message`, `list_network_requests`, `evaluate_script`) to get whole messages. `capture.sh.txt` is the per-scenario driver: it sets the viewport, opens the URL, waits 2.5 s, probes the page, saves the console and network lists and takes the screenshot. Transcript lines over 400 characters are cut to their first 200 and marked with the original length. Only Ajv's generated-function dump hits that limit.
- Viewports `1440x900x1` and `390x844x3,mobile,touch`, set with `chrome-devtools-axi emulate --viewport`.
- Ports: 4392 for `vite preview`, 4393 for the dev server, both bound to 127.0.0.1. Every server was stopped afterwards and `lsof -iTCP:4392 -iTCP:4393 -sTCP:LISTEN` came back empty.

`.scratch/parent-dist` is the lead's `pnpm web:build` output. I checked it against a fresh build. `git archive a62662e` went into `.scratch/repro/parent-src`, then `pnpm install --frozen-lockfile --offline` (exit 0) and `pnpm web:build` (exit 0). The SHA-256 of every file in the rebuilt `apps/web/dist` matched `.scratch/parent-dist`. The bundle is `assets/index-C-_zFqor.js`, sha256 `8fbeb4ca…7439`, and it has exactly one `Function(` call site, Ajv's compile path at `let i=Function(\`${r.default.self}\`,\`${r.default.scope}\`,g)` right after `this.opts.code.process`.

## Scenarios

`assertions.json` holds the numbers for each scenario and viewport: `rootChildren`, a 120-character `textPrefix`, `consoleErrorCount` and the error text, `cspEvalIssue`, the served CSP meta, style node counts, loaded fonts and any non-2xx request.

| Scenario | Served from | 1440 | 390 |
| --- | --- | --- | --- |
| `built-parent` | `.scratch/parent-dist` on 4392 | 0 root children, 2 errors, CSP eval issue | same |
| `dev-parent` | `.scratch/repro/parent-src` dev server on 4393 | 2 root children, 858 chars, 1 error (favicon 404) | 2 root children, 0 errors |
| `nocsp` (counterfactual A) | parent-dist minus the CSP meta, on 4392 | 2 root children, 0 errors | same |
| `eval-allowed` (disconfirming) | parent-dist with `'unsafe-eval'` added, on 4392 | 2 root children, 0 errors | same |
| `built-1eee6ae` (history) | `pnpm --filter @agora/web build` at `1eee6ae`, on 4392 | 0 root children, 2 errors, CSP eval issue | not captured |

### 1. Built room, parent bundle

Command: `pnpm --filter @agora/web exec vite preview --strictPort --port 4392 --host 127.0.0.1 --outDir ../../.scratch/parent-dist`. The `--outDir` flag works with `preview`. `curl` of `/` was byte-identical to `.scratch/parent-dist/index.html`, and the served JS hashed to the same `8fbeb4ca…`. The preview server sends no `Content-Security-Policy` header, so the meta tag is the only policy in force: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'`.

Result, identical at both viewports (`built-parent-1440-console.txt`, `built-parent-390-console.txt`):

- Issue: "Content Security Policy of your site blocks the use of `eval` in JavaScript", with `violatedDirective: script-src`, `contentSecurityPolicyViolationType: kEvalViolation` and source location `index-C-_zFqor.js` line 12 (0-based), column 26067.
- Error 1: Ajv's own `console.error("Error compiling schema, function code:", …)`, followed by about 7,000 characters of generated validator source.
- Error 2: `Uncaught EvalError: Evaluating a string as JavaScript violates the following Content Security Policy directive because 'unsafe-eval' is not an allowed source of script: script-src 'self'`. The stack runs `addSchema → _addSchema → validateSchema → validate → getSchema → _compileSchemaEnv → _compileMetaSchema → … → c` at `13:26067`, under a module-level frame at `30:917`.
- `#root` has 0 children and empty `innerText`. `built-parent-1440.png` and `built-parent-390.png` show only the page background.

The stack shows the first compile that fails is not an Agora schema. It is Ajv compiling the draft 2020-12 meta-schema so it can validate the first authored schema passed to `addSchema` (`validateSchema` is on by default). Any runtime Ajv instance that validates its schemas will generate code before it compiles a single wire validator.

### 2. Served development room

`git archive a62662e | tar -x -C .scratch/repro/parent-src`, `pnpm install --frozen-lockfile --offline` (offline worked), then `pnpm --filter @agora/web exec vite --strictPort --port 4393 --host 127.0.0.1` inside it. The served HTML has the React refresh preamble as an inline module script and no CSP meta or header.

The room renders at both viewports: 2 root children, the header text "Skip to messages ENGINEERING FIXTURE Agora local room fixture / General room …", 858 characters of text and the "No room loaded" empty state with its "Load fixture snapshot" button (`dev-parent-1440.png`, `dev-parent-390.png`). Console: Vite connect messages and the React DevTools notice. The one error at 1440 is `GET /favicon.ico [404]` on the first visit to that origin, which has nothing to do with this defect. The dev page has one `<style>` element because Vite injects CSS that way in development, and `style-src 'self'` would block it. That matches the comment in `vite.config.ts` about why dev runs without the policy.

### 3. Counterfactual A: the CSP masks, it does not cause

`.scratch/repro/no-csp-dist` is a copy of parent-dist with only the CSP meta line removed. `no-csp-index.diff` shows the one deleted line, and the asset hashes match parent-dist exactly. Served on 4392 with the same `vite preview` command (`--outDir ../../.scratch/repro/no-csp-dist`), the identical JS bundle renders the room at both viewports with 0 console messages. `nocsp-1440.png` and `nocsp-390.png` are byte-identical to `dev-parent-1440.png` and `dev-parent-390.png` (sha256 `9e487355…` and `ac53596c…`), so the production bundle draws the same pixels as the dev server once the eval is allowed.

### 4. Counterfactual B: the trigger outside any browser

`probe.mjs.txt` (run from `.scratch/repro/probe.mjs`) builds a jsdom 30.1.0 window from `index.html`, copies its globals onto Node's and imports the built bundle. I ran it from `.scratch/repro/parent-src/apps/web` so `jsdom` resolves from the parent's own lockfile without placing a file next to the worktree's `apps/web`.

- `node probe.mjs .scratch/parent-dist` (`node-probe-codegen-allowed.txt`): import resolves, `rootChildren: 2`, text starts "Skip to messagesENGINEERING FIXTUREAgora local room fixture / General room…", no uncaught errors.
- `node --disallow-code-generation-from-strings probe.mjs .scratch/parent-dist` (`node-probe-codegen-disallowed.txt`): import throws `EvalError: Code generation from strings disallowed for this context` at `Function (<anonymous>)` from `index-C-_zFqor.js:13:26067`, the same column Chrome reported. `rootChildren: 0`, empty text, and stderr carries the same Ajv "Error compiling schema" dump (cut to 200 characters).

The same bundle fails the same way with no CSP, no browser and no HTML policy, only a runtime that refuses string code generation. The trigger is the bundle's runtime code generation, and CSP is one environment that exposes it.

### 5. History

`history.txt` holds the commands and their raw output. `history.sh.txt` is the script that produced it.

- The CSP is first in `5f2e852` (2026-09-22, "archive: preserve slot12's uncommitted browser virtualization snapshot"), with a duplicate in the checkpoint `a6a4c03`. On the first-parent line it arrives in the merge `1eee6ae` (parents `e34df8f`, which has no CSP, and `5f2e852`). Plain `git log -S contentSecurityPolicy -- apps/web/vite.config.ts` lists only `5f2e852`. `--full-history` adds `a6a4c03`.
- The fixture's runtime validator came first. `createWireValidator()` is called at module load in `apps/web/src/fixture/adapter.ts` from `4a77a8f` (2026-09-20), and moved to `apps/web/src/host/fixture.ts` in `eb7e818`. `5f2e852` itself has both the CSP and the call, so the snapshot that introduced the policy already contained the code it blocks.
- `contracts/tools/browser-validator.ts` has one commit, `9882342` (L3). D92 (2026-09-21) reads "Compile browser validators from the authored schemas before launch instead of allowing runtime evaluation" and cites `evidence/local-room/runtime/browser-csp.red.log`. That fixed the served room in `scripts/local-room-service.ts` one day before the CSP reached `apps/web`'s own Vite config, and the alias never went into `apps/web/vite.config.ts`.
- To check whether the fixture build ever worked under the CSP, I built `1eee6ae` the same way (`.scratch/repro/csp-intro-src`, offline install, `pnpm --filter @agora/web build`). Served on 4392 at 1440 it gives the same CSP eval issue, the same two errors and 0 root children (`built-1eee6ae-1440-console.txt`, `built-1eee6ae-1440.png`). The codegen-disallowed Node probe throws the same `EvalError` at `13:26068`. The built fixture room has been blank since the commit that added the CSP.
- Prior evidence never recorded a working load. `evidence/local-room/virtualization/salvage-inventory.md:268` only confirms the meta is present in `apps/web/dist/index.html` after a build. `evidence/local-room/virtualization/planning-checkpoint.md:89` plans a benchmark against `pnpm web:build && pnpm web:preview` on 4175 but records no results. The first written record of the blank page is the code-block diagnosis report (`agora-narrow-code-block-diagnosis/report.md`, "Not reachable in a production build"), and in the repo it is `evidence/handoff/README.md:83`, added in `42bd807` on 2026-10-02.

### 6. Disconfirming checks: other CSP violations

Removing the whole CSP in counterfactual A hides any other directive the build might break, so I ran one more variant. `.scratch/repro/eval-allowed-dist` keeps the CSP and adds only `'unsafe-eval'` to `script-src` (`eval-allowed-index.diff`). That keeps `default-src`, `style-src`, `img-src` and the font fallback to `default-src 'self'` enforced.

- At load, both viewports render (2 root children, same text prefix) with 0 console messages.
- `eval-allowed-drive.txt` drives the room at 390: "Load fixture snapshot" (8 articles, status "Live Cursor 8 applied"), "Load large room (400)" (15 mounted articles, "Live Cursor 400 applied"), then typing in `composer-text` and pressing Enter. The console has no messages afterwards. The virtualizer sets 16 `style` attributes through the CSSOM, which `style-src 'self'` allows. It never creates a `<style>` element.
- `eval-allowed-1440.png` is byte-identical to `nocsp-1440.png`. `eval-allowed-390.png` is not byte-identical to `nocsp-390.png` (229,096 against 229,065 bytes) although the DOM probe values match. I did not diff the pixels.

`static-scan.txt` checks the built files directly. `index.html` has no inline `<style>`, `style=` or inline `<script>`. The built CSS has 0 `data:` URLs and six `url()` font references, all same-origin under `/assets/`, with no `@import` or external origin. The JS has 1 `Function(`, 0 `new Function`, 0 `eval(`, 0 string timers, and none of `createElement("style")`, `insertRule`, `adoptedStyleSheets`, `setAttribute("style"` or `cssText`. The `https://` literals in the JS are schema `$id`s, SVG and MathML namespaces and the React error URL. The network lists show no request outside 127.0.0.1.

The eval block is the only CSP violation in the built fixture room. The handoff's "known `data:` font CSP error" belongs to the served L4 room bundle. This fixture build has no `data:` font, and I did not test the served room.

## Files

- `README.md`: this file.
- `assertions.json`: values for each scenario and viewport.
- `<scenario>-<width>.png`: screenshots, 23 KB to 229 KB each.
- `<scenario>-<width>-console.txt`: console list, each message in full, network list and page probe.
- `node-probe-codegen-allowed.txt`, `node-probe-codegen-disallowed.txt`: counterfactual B output.
- `no-csp-index.diff`, `eval-allowed-index.diff`: the only edits made to the copied `index.html` files.
- `eval-allowed-drive.txt`: the interactive drive under CSP with `'unsafe-eval'` added.
- `static-scan.txt`: static scan of parent-dist for CSP-relevant constructs.
- `history.txt`: git history and the `1eee6ae` build probe.
- `probe.mjs.txt`, `capture.sh.txt`, `axi-raw.mjs.txt`, `history.sh.txt`: the scripts that produced the above, saved as text so lint and typecheck skip them. They run from `.scratch/repro/`.

Scratch inputs that are not committed stay under `.scratch/repro/`: `parent-src` and `csp-intro-src` (archives with installed `node_modules`), `no-csp-dist`, `eval-allowed-dist`, server logs and raw bridge output in `raw/`.
