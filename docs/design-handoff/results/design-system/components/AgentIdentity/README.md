# AgentIdentity

Every agent gets a pastel tint and a glyph inside a rounded square. People are circles with initials on a neutral fill, and never take a tint.

This is how a busy room stays legible. When four runs are talking at once, a reader tracks them by colour before reading a name, the way you track speakers in a group chat by avatar. The shape rule keeps the packet's requirement that an agent can never be mistaken for a person: squircle means agent, circle means human, regardless of colour.

## The tint system

Six cool pastels: blue, violet, mint, sky, pink, teal. Two are fixed: `center` is always blue and the project agent is always violet. Task agents take the next free tint at spin-up, in order, and keep it for the run's whole life, including in history. When six are live the cycle repeats and the glyph plus run number disambiguates.

Each tint is a pair: a pastel fill and a soft glyph colour of the same family. The glyph sits on the fill; the agent's name is always set in `ink`, never in the tint. The pair is identity only and carries no text.

## Where the tint appears

- The agent's mark, everywhere the agent speaks or is listed.
- Beside the agent's row when the agent is the subject: live-run lists, the phone home. The row itself stays neutral.

## Where it never appears

- On state. State is a neutral chip with one dot, and a tint never means running, passed or failed.
- On a person.
- As a border, outline or left bar.

## The consumer provides

The principal, its kind, and for a task agent its assigned tint index and the human it acts for.

## Do not

- Do not reassign a tint mid-run.
- Do not give an agent a photo, a face or a round mark.
- Do not use a tint to mean anything but identity.
