# Local ask contract preparation

## Subject

The implementation subject is `7d8fb9997283b5e5874a787a36b1c587f953f27b` over main `6091fa12063987f0cadc320047804ff4049befba`. It changes four authored wire sources (`contracts/schemas/local-room.schema.json`, `contracts/openapi.json`, `contracts/fixtures/vectors.json`, `contracts/swift/Sources/AgoraContractsConform/main.swift`), the generated TypeScript and Swift consumers, and one test. Every one of the eleven contract files is byte-identical to the reviewed reference commit `0b7f10407507206619c4d5aac7b313d445d0ab44` in the API worker's retained copy, which this task read and never edited.

This is contract preparation. It adds no endpoint, provider, answer principal, browser control or database change, and the evidence below is not a completed-chat claim.

## Red and green

`red.log`, `green.log`, `test-patch.diff` and `manifest.json` come from `node scripts/record-red-green.mjs` with the focused command `pnpm exec vitest run --project contracts contracts/test/local-room.test.ts -t 'ask contract'`. At the parent the vectors travel with the test patch but the schema does not define the components, so the assertion on the first vector fails (`red_exit` 1). At the head it passes (`green_exit` 0). The red is an assertion, not a missing import or runner.

## Guard negatives

`guard-negatives.log` breaks one guard at a time in the tracked file and restores it byte for byte, comparing SHA-256 before and after.

| Broken guard | Result |
| --- | --- |
| `LocalAskCommand` opened to extra properties | `local-ask-tools-field` accepted, test red |
| `selected_ids` limit raised from 10 to 11 | eleven ids accepted, test red |
| `question` limit raised from 1000 to 2000 | long question accepted, test red |
| `failure` enum given a seventh reason | unknown reason accepted, test red |
| `getLocalAskStatus` operation renamed | operation pair assertion red |
| Schema edited without regenerating | `pnpm contracts:check` exits 1 with `openapi.bundled.json` drift |

After restoring, the five-test file passes and `contracts:check` exits 0.

## Endpoint absence

`absence-drive.log` drives a disposable instance started with `node scripts/local-room.ts start`. A key is not the barrier on this surface (the room accepts any loopback request with the right Host, Origin and JSON content type), so the log shows an authorized control first.

1. A well-formed `POST /api/v1/local-room/messages` returns 201 and commits one message.
2. A well-formed `POST /api/v1/local-room/ask` over that message, with the real project, room and message IDs, returns 404 `not_found`.
3. A malformed ask and `GET /api/v1/local-room/ask?command_id=...` return the same 404 body, and so does a path that never existed.
4. The final snapshot holds the one human message and no answer.
5. `git grep` finds no ask route, provider or operation reference under `apps`, `packages` or `scripts`.

The 404 is the framework default for an unknown route, not a typed `unavailable_capability` denial, so the service is not activated. No model was invoked.

## Baseline browser smoke

`baseline-smoke-desktop.png` is a `chrome-devtools-axi` capture of the same instance at desktop width. The page loads from the built harness, shows the header text "local runtime, no model provider", accepts a sent message, and **Quote locally** posts a message labelled "local agent (fixture)" and "Deterministic local fixture (not AI inference)". A scan of buttons, links and tabs finds nothing mentioning ask, Claude or a question. The console holds one documented error: the room's content security policy has no `font-src` and blocks the inlined fonts, described in `docs/site/local-room.md`. No 390 px or native proof is claimed here; the earlier phone captures belong to the preserved combined change.

## Cleanup

`cleanup.log` shows `stop` (listeners stopped, data retained), `status` (stopped), `reset --confirm-disposable` (owned data removed) and a final `status` that finds no instance root. The browser session was stopped and no listener or process remained. The retained preview, its data and the reference copies were not touched.

## Not proven

CI, independent review, the question panel, the answer service, the provider, 390 px behavior and U04 qualification are all separate. The generated clients now expose two operations that no server answers.
