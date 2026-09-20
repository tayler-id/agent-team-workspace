# Configuration reference

Current configuration is a contributor fixture's environment, not a production workspace setup file. Do not configure model, email, cloud or GitHub accounts to follow these pages.

## Current environment variables

| Name | Consumer | Meaning / default |
| --- | --- | --- |
| `DOCS_PORT` | Documentation server | Loopback port; default 4173 |
| `PORT` | Center process | Loopback port; default 3000 |
| `AGORA_DATABASE_URL` | Center and public probe | Non-owner PostgreSQL service connection; required |
| `AGORA_MIGRATION_DATABASE_URL` | Migration CLI | Schema-owner connection; required for a persistent migration |
| `AGORA_TEST_DATABASE_URL` | Test wrapper / pg tests | Existing disposable non-owner test connection; unset creates a throwaway cluster |
| `AGORA_TEST_OWNER_DATABASE_URL` | Pg tests | Existing disposable schema-owner connection |
| `AGORA_TEST_BYPASS_DATABASE_URL` | Guard-negative test | Existing disposable BYPASSRLS member of the app role |
| `AGORA_TEST_SUPERUSER_DATABASE_URL` | Prerequisite negative | Existing disposable cluster administrator; test temporarily renames a role |

The wrapper exports the normal app/migration URLs for its owned cluster. Prefer that path to configuring the four test URLs yourself. A database URI can contain a password; do not commit it or paste it into evidence. [Development runbook](repo:docs/runbooks/development.md) owns exact role prerequisites.

## Source-owned configuration

- `package.json` and `pnpm-lock.yaml` pin JavaScript tooling.
- `contracts/swift/Package.swift` and `Package.resolved` pin Swift packages.
- `contracts/swift/openapi-generator-config.yaml` controls generated client/type output.
- `contracts/schemas/*.schema.json` and `contracts/openapi.json` own the wire surface.
- `docs/site/site.json` owns navigation and tool homes; `atlas.json` owns progress.

Generated consumers and `.docs-dist/` are outputs, not places to configure behavior. [The authoring guide](authoring.md) explains site content ownership.

```flow
Authored source | Schema, dependency pins and reviewed configuration.
Validation | Reject unsupported contracts, missing docs, stale diagrams and broken links.
Derived output | Generated consumers and static HTML; no hidden hosted configuration.
```

## Future production configuration

The specification defines deployment keys, roles, budgets, model routes, worker grants, artifact storage, SMTP and GitHub scopes. No deployed settings UI or complete production config file exists. Default limits such as a 60-second lease and 30-minute run are **design requirements**, not evidence that enforcement is implemented.

Future configuration must distinguish a human's authorization from a model's suggestion. A chat message must never mutate roles, egress, budgets or tool allowlists. See [authorization](authorization.md), [operations](operations.md) and the [technical specification](repo:docs/technical-spec.md).
