# Layout mocks

Every mock is a 2x PNG rendered from the standalone `preview.html` beside each component in `design-system/components/`, with `design-system/tokens.css` and the shipped Cal Sans fonts. Light mode only. Open the `preview.html` in a browser to see the same layout live.

## Screens

| File | Viewport | What it shows |
| --- | --- | --- |
| `screens/screen-approval.png` | 1440x900 | Steps 10 and 11: approve publication and see the draft open. The card is a contract; the button binds the head; CI pending stays visible |
| `screens/screen-ask.png` | 1440x900 | Step 4: ask the center. The scope preview shows what will be read, what was omitted, who pays, and the audience, before anything is spent |
| `screens/screen-evidence.png` | 1440x900 | Step 9: review evidence. Intent, exact head and base, changed paths, every scenario with its verdict, artifacts, trust, cleanup, then the diff |
| `screens/screen-inbox.png` | 1440x900 | Step 12: the inbox. Mentions, questions, approvals, failures, with age and source. Reading does not resolve |
| `screens/screen-launch.png` | 1440x900 | Step 6: launch on a selected machine. Own machines only, both budgets above the fold, RunSpec digest always visible |
| `screens/screen-phone.png` | 1300x880 | 390 wide: the room, the run pane as its own route with a back control and sticky state head, and the inbox greeting |
| `screens/screen-recovery.png` | 1440x900 | Step 8: recover a lost run. Last observed facts, unknown stays unknown, every choice names its consequence |
| `screens/screen-room.png` | 1440x900 | Step 2 and 3: enter the project room, converse, open a thread. Rail, timeline, thread pane |
| `screens/screen-run.png` | 1440x900 | Step 7: follow and steer. The run pane's head is committed state; the stream below is history. Steering says what it cannot do |
| `screens/screen-signin.png` | 1440x700 | Step 1: invitation and sign-in. Magic link, one acceptance, no public sign-up |

## Components

| File | Canvas | What it shows |
| --- | --- | --- |
| `components/agentcard.png` | 900x720 | The agent session card: queued, provisional, committed with citations, question, unresponsive, error, insufficient evidence |
| `components/agentidentity.png` | 900x520 | Every agent gets a tint and a glyph in a rounded square. People are circles and never take a tint |
| `components/approvalcard.png` | 900x760 | Grant or deny one exact action. Pending, waiting, granted, consumed, denied, expired, invalidated |
| `components/checkoutcomemark.png` | 900x330 | Pass, fail, blocked, unavailable, infrastructure error. Skipped does not exist |
| `components/citation.png` | 900x380 | Generated from a stored record ID, opens the exact revision. Model text stays plain |
| `components/commandoutput.png` | 900x460 | Command ID, argv with secrets redacted, exit, duration, bounded output with a truncation marker |
| `components/composer.png` | 900x720 | Idle, typing, over limit, offline unsent, rate limited, observer, steering |
| `components/countdown.png` | 900x300 | Deadline for questions, approvals, queue wait, capability expiry. Running and expired |
| `components/cover.png` | 900x300 |  |
| `components/credentialconfirmation.png` | 900x380 | Owner confirms use of their local Git credential for one effect. Confirm, decline, capability expired |
| `components/decisionrecord.png` | 900x420 | A human's exact words as a durable record with source, scope, effective date and supersession |
| `components/diffviewer.png` | 900x400 | Read-only, opened last. Every hunk maps to a claim or is marked unmapped |
| `components/evidencecard.png` | 900x760 | Intent, exact base and head, changed paths with risk, every scenario, artifacts, trust class, cleanup, diff last |
| `components/launchpreview.png` | 900x720 | Bind and confirm a run: own machines only with heartbeat, RunSpec digest, both budgets separately, payer, attempt count |
| `components/machinestatus.png` | 900x480 | Name, owner, OS, heartbeat age, registered repositories, capabilities, adapter versions, doctor result |
| `components/memberrolecontrols.png` | 900x560 | Role selectors with the exact subject shown, last-owner protection, a revocation that names the loss |
| `components/navigationrail.png` | 900x620 | Rooms, projects, runs and the inbox in one landmark. Expanded, and the states that change it |
| `components/offlinebanner.png` | 900x300 | Connection state and the action it requires, spanning the shell. Offline, resync required, revoked |
| `components/publicationstatus.png` | 900x560 | Follow the external effect: awaiting approval, authorized, pushing, reconciling, draft open with CI pending, CI failed, blocked |
| `components/recoveryactions.png` | 900x560 | After loss: last observed facts, lease expiry, cleanup state, retained worktree, and three choices that name their consequence |
| `components/roomheader.png` | 900x380 | Project, lifecycle, main-agent identity, member count, search. Active, paused, archived, onboarding blocked |
| `components/runcard.png` | 900x520 | A run row: the delegate's tint, owner and placement, committed state as a chip, one action |
| `components/runpane.png` | 900x720 | Sticky state head, typed activity stream, question with deadline, steering, cleanup, budget used of reserved |
| `components/scopepreviewlist.png` | 900x560 | Selected records with author, time, audience, trust class; omissions; payer; ceiling. Complete, partial, audience restricted |
| `components/searchresult.png` | 900x520 | Type, snippet, room, time. Access filtered before ranking. 50 per page |
| `components/statebadge.png` | 900x400 | State chips: neutral pill, word in ink plus one dot. Violet is live. Unknown is loud, not quiet |
| `components/systemevent.png` | 900x330 | Membership change, redaction, resync, revocation. Informational, never a control |
| `components/taskcard.png` | 900x700 | Persistent summary in the thread across its seven states, with the actions each state allows |
| `components/taskeditor.png` | 900x680 | Create or edit a task: intent, acceptance list, allowed paths, dependencies, owner. Empty acceptance blocks save |
| `components/taskpane.png` | 900x680 | The full task: intent, acceptance, scope, dependencies, attempts, edit mode |
| `components/threadpanel.png` | 900x720 | Root and ordered replies. Open, empty replies, root tombstone. Focus returns to the trigger on close |
| `components/timelinemessage.png` | 900x520 | People and agents in one timeline: circles and squircles, the agent's name in its tint, the unread rule as a chip |
