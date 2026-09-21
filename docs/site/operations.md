# Operations and recovery

There is no qualified production deployment yet. This page separates operating the documentation and fixture today from the future center's release requirements.

## Documentation deployment

```sh
pnpm install --frozen-lockfile
pnpm docs:build
```

The build emits `.docs-dist/`: ordinary HTML, one local CSS file, a Markdown atlas companion and read-only source views. No CDN, analytics, remote font, JavaScript runtime, hosted account or application server is required to read it. Internal links are relative, so the directory can be mounted under a subpath such as `/agora/`.

Deploy **only** `.docs-dist/`, not the checkout or evidence directory. Source views contain only explicitly linked repository records; machine-specific home paths are redacted. This is not a private-document publishing mechanism. Review every new source link for disclosure before publishing. A future deployment can upload this directory to a static host through a separately reviewed pipeline.

For local development, `pnpm docs:dev` serves loopback only and rebuilds on page requests. Ctrl+C stops that process. `.docs-dist/` is disposable output; logs under `evidence/` are not.

## Fixture operation

Use the [temporary cluster wrapper](cli.md) for tests. Persistent fixture databases need owner/app roles as described in the [development runbook](repo:docs/runbooks/development.md). The service role must not own tables or bypass row security. Readiness currently proves database reachability, not complete operational health.

The [local-answer pure-core test driver](cli.md#local-answer-pure-core) needs no service, database connection or credential. Do not wire it into a running room from this stacked candidate. It proves deterministic proposals only; it cannot persist responses or suppress duplicate triggers across storage. L2 and applicable CI protections must land before rebase and independent exact-head review of this candidate.

## Target production topology

```flow
TLS edge | Planned Caddy termination on one small hosted deployment.
Modular center | Planned API, scanner and outbox with health and telemetry.
Durable stores | PostgreSQL 18 plus S3-compatible artifacts, never worker-local truth.
Off-host recovery | Encrypted backups, WAL and independently recoverable keys.
Restore qualification | Prove integrity, rotate epoch and deny old worker authority before resuming.
```

One host is deliberately not high availability. The planned recovery budget is RPO at most 15 minutes and RTO at most four hours. U01c must prove separate-host restoration before product features proceed. A backup file without recovered keys, rows and artifacts is not a restore result.

## What operators will need to observe

The design calls for queue delay, semantic progress, lease expiry, outbox uncertainty, artifact growth, spend and backup lag. A heartbeat alone must not make a stuck run look productive. An uncertain external effect must be reconciled by read-back, not blindly retried.

Stop and retry operations must preserve historical evidence. A new deployment epoch invalidates authority from the lost server. Destroy/cleanup failure stays visible until the provider or owned process can be observed.

## Release gate, not deployment instructions

Compose/Caddy configuration, secrets management, retention enforcement, protected check reporting and recovery runbooks remain to be implemented and qualified. [R15/R17](repo:docs/technical-spec.md) specifies them; [verification](verification.md) explains why docs or a passing fixture cannot qualify them.
