# PublicationStatus

The card that follows the external effect after approval: awaiting approval, authorized, pushing, reconciling, draft open with the CI state labelled `CI pending` until required checks pass, CI failed, blocked with a reason. The draft link appears on the card.
A lost push response enters reconciling until read-back agrees; nothing is repeated blindly. Agora marks the task completed only after it observes the merge and a post-merge scenario passes.

## Do not

- Do not call the draft a PR.
- Do not show draft open without the CI state beside it.
