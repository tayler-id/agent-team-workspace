# U22 lane 9 renderer bypass diagnostic

Parent `6091fa1`, code head `fef7edb`. `red.log` shows the new test failing on the parent because the
`agora/renderer-footgun` message for `window.matchMedia` names only the Host owner path. `green.log` shows it
passing at the head. Generated with `scripts/record-red-green.mjs`.

Validate against the code head, since this README and the receipts land in a later commit:

    node scripts/validate-evidence.mjs --dir evidence/U22/host-method-diagnostic --base 6091fa12063987f0cadc320047804ff4049befba --head fef7edb4f89d82816e588a6ce3346fd5f10188bf

Only the message text changed. The enforcement predicate, ownership rules and runtime are untouched. A global with
no equal-purpose `EnvironmentPort` method (`window.name`, `fetch`) still gets the owner path only. This is not a
qualification of lane 9 or the unit.

This series replaces the first publication of the same change (PR 25, head `0315ae1`). That branch grouped a
test-lifecycle change with feature-map metadata, which the per-commit red/green consumer cannot replay, so the change
is republished here in separate commits. The original branch and proof are retained unchanged.
