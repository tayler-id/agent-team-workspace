# Audiences and authority

Every principal below has an identity in the interface. Humans hold authority. Agents and machines are delegates with an audit identity and no ambient power. Source: spec [R04](../technical-spec.md#r04-identity-authorization-and-agent-hierarchy) and [R14](../technical-spec.md#r14-human-authorization-matrix).

## Audiences

| Principal | Who it is | Sees | Can do | Cannot do |
| --- | --- | --- | --- | --- |
| Workspace owner | The person who runs the deployment's workspace | Workspace settings, members, general rooms, project list | Invite, change workspace roles, revoke, register a repository, archive or delete a project, approve platform-level changes | Read a project room without an audited self-grant visible to that project's maintainers |
| Workspace member | An invited developer | General rooms, the projects they belong to | Talk in general rooms, ask the center in rooms they can read, be granted project roles | Enter a project without a maintainer's grant |
| Workspace observer | A read-only invitee | Same rooms as a member | Read | Post, ask, spend, or launch, even with a contributor project grant |
| Project maintainer | A developer who governs one project | Everything in that project | Manage project roles and policy, approve publication when not the author, record overlap reviews, pause or resume, activate knowledge (S2), enable the observer (S3) | Approve their own task's publication, merge in Agora |
| Project contributor | A developer who works in one project | The project room and its records | Talk, ask, propose tasks, own tasks, launch on their own machine, steer, cancel, retry | Approve publication, change policy, launch on someone else's machine |
| Project observer | A read-only project member | The project room | Read | Post, ask, launch |
| Center agent | One workspace-wide service principal | Records the asker and the destination room may both read | Answer questions with citations, propose tasks or projects | Run a shell, write to a repository, assign work, approve anything, self-approve |
| Project-main agent | One stable identity per project. Displays `not_enabled` in S1, active in S2 | Reviewed project context | Answer from reviewed context, propose a task graph, ask a human to launch, follow outcomes | Approve, launch, or acquire a person's machine |
| Task agent | One execution identity per run | The fixed tools in its RunSpec, inside its isolated attempt | Read, list, patch files, run commands inside the attempt | Reach the host, credentials, the network outside policy, or anything after its lease ends |
| Local worker | A device principal bound to one human's machine | Assigned runs for that human on registered repositories | Claim eligible runs, upload evidence, report facts, push an approved draft with the owner's confirmed credential | Access the database, use another person's credential, run without an explicit human launch |
| Cloud runner (S2) | A pool service principal | Runs assigned to the pool for allowed projects | Same run contract as a local worker in a fresh microVM | Hold center or GitHub credentials in the guest, become a source of project state |
| Native client device (S2) | A revocable session of a human on a Mac | Same as that human in the browser | Same human actions with scoped tokens and recent-auth proof | Enroll or impersonate a worker |

## Authority matrix

Show these as commands with a preview and a receipt, never as chat text. The interface must make the "who" and the "what exactly" visible before the click.

| Action | Who may do it | What the confirmation binds |
| --- | --- | --- |
| Invite, change role, revoke | Workspace owner; project maintainer within their project | Exact subject and role; never removes the last owner |
| Ask center | Member or owner with access to the destination room; contributor or maintainer in a project room | Selected records, payer, answer cost ceiling |
| Launch a local run | The task owner, on a machine they own | RunSpec digest, repository, base commit, scope, cost, isolation preview |
| Launch a cloud run (S2) | Contributor with a project spending grant | Same RunSpec plus data destination and budget |
| Steer or answer a run | Task owner or project maintainer | An immutable prompt; cannot widen scope, tools, payer, or placement |
| Cancel a run | Task owner or project maintainer | Immediate revocation; cleanup shown separately |
| Retry | Task owner | A new attempt with the same placement and current budget |
| Approve draft publication | A project maintainer who is not the task owner, plus the credential owner's separate confirmation | Exact head, base, evidence, policy; expires in 30 minutes |
| Promote, review, merge | Humans on GitHub | Agora never merges |
| Register a repository | Workspace owner plus verified repository maintainer | Immutable repository identity and policy read-back |

Two rules shape the whole product. Reading an inbox item acknowledges attention but resolves nothing. And in a two-person team, one person launches and confirms their credential while the other approves publication and reviews, so an absent reviewer produces an honest waiting state, not a shortcut.
