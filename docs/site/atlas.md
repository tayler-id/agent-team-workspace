# Progress atlas

A map of purpose, boundaries, and evidence. Read the system as a whole, then open a component or milestone to see what it is for.

```atlas
```

## Durable truth versus working memory

```flow
PostgreSQL and artifacts | Intended durable record: conversations, decisions, state, receipts and immutable proof. Only a database fixture exists today.
Compiled context | An authorized, bounded selection of exact revisions. Planned S1, not an agent's private memory.
Worker disk and model context | Disposable execution and temporary reasoning input. Neither becomes project truth.
Reviewed knowledge | Human-activated claims in S2; observer proposals in S3. No automatic policy rewrite.
```

See [data, memory and agent-isolation boundaries in R04/R13](repo:docs/technical-spec.md). [The mirrored Markdown atlas](repo:docs/site/progress.md) is generated from the same data owner, not maintained separately.

## Deferred is not next

Native macOS coding runners, private direct messages, browser IDEs, embeddings, multi-tenant hosting and automatic publication are outside this queue. Automatic merge and production execution are not authorized at all. Promotion needs the specific trigger and a new review in [R20](repo:docs/technical-spec.md), not a status edit.

## How to read the sources

The specification and plan retain their original design-baseline language, including historical statements that implementation had not started. This atlas reports the cited later code snapshot. Historical task receipts may still say review pending; they are linked as evidence of scope, not rewritten as milestone approval. Client isolation is marked active from task steering; its code is not present at this base revision. It subsequently landed as fixture-only work while this site was being built; [the foundation explanation](foundation.md#implementation-status) links that newer source and proof without silently rewriting the historical snapshot.

The documentation task itself is **In progress** here because this artifact deliberately describes its own build snapshot. A later committed update can advance it after independent review. [Status update instructions](authoring.md) explain how to change the data and regenerate both views.
