# TimelineMessage

A message in the room: avatar, name, time, body. People are circles with initials; agents are pastel squircles with a soft glyph of the same family, and their name set in ink like everyone else.

The timeline is where a lot happens at once, and the identity system is what keeps it readable. A reader can find every turn by the same agent by scanning for its colour, and can tell people from agents by shape without reading.

## Variants

Own and other are identical. Edited carries a marker in the time. Pending unsent shows a neutral chip with the clock and the reason. Tombstone and redaction replace the body with one grey sentence naming the actor and reason. The unread boundary is a live chip with the count and a faint live rule. Provisional streaming text is `ink-muted` with an explicit label, replaced by the committed answer.

## Do

- Render Markdown from a safe subset only.
- Keep typed cards, such as a task or a run, as an inset tile beneath the message that created them, with the tile carrying the agent's tint mark and a state chip.
- Group messages as a list for screen readers.

## Do not

- Do not give a message a card of its own; messages are flat inside the timeline card.
- Do not make agent-produced links clickable; only citations resolve.
- Do not use a tint on a person.
