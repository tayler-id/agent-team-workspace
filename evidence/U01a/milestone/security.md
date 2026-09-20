# U01a milestone security notes

head: b9c65c4487b9c08237d22cb4be4ae92999308bc4
recorded_at: 2026-09-20T20:35:00Z

## Risk floor

R2, matching the four constituent tasks: this qualification changes no product behavior, adds no
model call, service credential, publication operation, guard-disable CLI flag, production identity
or storage service. It runs the repository's own committed, reviewed verification commands against
the committed head and records their real output.

## Findings

- `pnpm audit --json` at this head: 0 vulnerabilities across 291 dependencies (`evidence/U01a/milestone/doctor-audit.json`).
- Credential-pattern scan (`git grep` for AWS access keys, PEM private key headers, Slack/GitHub/Google
  API token literal signatures) across the full tracked tree: zero matches.
- `git remote -v`: no remote configured; this qualification made no push, no PR, and no merge.
- The only destructive-capable git operations run during qualification were `git checkout -q --
  <path>` restores after two deliberate break-and-restore negatives (Lane 6's generated-file drift
  mutation), each immediately verified byte-identical with `git diff --quiet`, and disposable
  `git worktree add --detach` / `git worktree remove --force` pairs for Lane 3 and the red/green
  replay, each pruned afterward (see Cleanup below). No tracked file was left modified.
- No new source, script, or dependency was added by this qualification; it produced only files under
  `evidence/U01a/` and this task's living-documentation changes.

## Independent inspection of prior task evidence

Spot-checked rather than only re-run:

- `evidence/U01a/agora-s1-enforce-test-first/performance-diagnostic-plan.md` sha256 matches the
  `plan_digest` recorded inside the corresponding `performance-diagnostic.json` exactly
  (`917b514c1c1c6633c4239aa26ab042f01e131e67bebf7e53eaeadf2737f88e1d`), so the diagnostic's own
  provenance claim about which plan it executed is not merely asserted prose.
- `performance-diagnostic.json`'s `metrics` object was read directly (not the task README's
  paraphrase) and its ratios independently match what the README states; see
  `evidence/U01a/milestone/performance.md`.
- `agora/feature-map.json`'s `owner` fields were cross-checked against the task-breakdown Build
  boxes (U01a.B01-B04) and each listed scenario file was confirmed to exist at this head.

## Cleanup

```text
$ git worktree prune
$ git worktree list | grep -c 'agora-red-\|agora-green-\|agora-clean-' || echo "worktrees: clean"
worktrees: clean
$ ls "${TMPDIR:-/tmp}" | grep agora- || echo "tmp: clean"
tmp: clean
$ git status --short | grep -v '^?? evidence/'
no unexpected tracked changes
```

Evidence under `evidence/U01a/` survives cleanup; no cluster, worktree, or loopback server does.
Human review remains required; this is a local owner-attested proof, not a sandboxed or
tamper-proof attestation, and not trusted CI or merge authority.
