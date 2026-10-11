# U22 lane 9 renderer bypass diagnostic

Parent `aa86dfd`, code head `6f1d915`. `red.log` shows the new test failing on the parent because the
`agora/renderer-footgun` message for `window.matchMedia` names only the Host owner path. `green.log` shows it
passing at the head. Generated with `scripts/record-red-green.mjs`.

Validate against the code head, since this README and the receipts land in a later commit:

    node scripts/validate-evidence.mjs --dir evidence/U22/host-method-diagnostic --base aa86dfd8347c457a055d62c3a76fe5b75c853fa1 --head 6f1d9158aae4603a1c82e91c36b317c2b6f7b19a

Only the message text changed. The enforcement predicate, ownership rules and runtime are untouched. A global with
no equal-purpose `EnvironmentPort` method (`window.name`, `fetch`) still gets the owner path only. This is not a
qualification of lane 9 or the unit.
