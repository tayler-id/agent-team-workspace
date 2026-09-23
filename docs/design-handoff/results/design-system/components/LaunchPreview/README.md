# LaunchPreview
The budget and placement confirmation: the owner's own machines with heartbeat age, RunSpec digest and details, base commit, allowed paths, environment, tools, provider, model route, payer, execution and verification budgets separately, attempt count.
Budgets, payer and machine stay above the fold at both viewports. The digest stays visible while details collapse. There is no machine-to-machine or local-to-cloud fallback.
## States
Ready; no eligible machine; machine offline, queue with deadline; attempt limit reached.
## Do not
- Do not hide the payer behind details.
- Do not present a reservation as sufficiency.
