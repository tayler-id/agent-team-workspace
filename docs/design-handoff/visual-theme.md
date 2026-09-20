# Visual theme and art direction

One recommended direction, stated so the design team can accept it, adjust it, or argue with it. Nothing here is a finalized brand decision; see the last section for what is a starting token and what still needs a decision. Constraints that are not negotiable come from spec [R18](../technical-spec.md#r18-accessibility-and-performance-budgets) and the [accessibility requirements](accessibility-and-responsive.md).

## Recommended direction

Call it the ledger room. An agora was a place where a town did its business in public: people talked, decisions were spoken aloud, and records were kept where anyone could read them. Take the public-record part, not the marble. The interface should feel like a well-kept shared ledger in a quiet room: paper-toned surfaces, ink-dark type, hairline rules, and one signal color that lights up only when something is happening right now.

What that means in practice:

- Conversation sits flat on the page. Typed work objects (task, run, evidence, approval) sit on a raised surface with a hairline border. The eye learns that a raised surface means "a record with authority" and flat text means "a person talking".
- Hierarchy comes from type weight, size, and spacing, not from color or boxes. Density is high, in the way a good terminal or a good ledger is dense, but every row has room to breathe.
- Color is a signal, never decoration. Saturated color appears only on state that is live right now: a run that is running, a question waiting on you, a countdown about to expire. Everything else is neutral.
- No literal Greek ornament, no columns, no laurel. No neon, no glow, no gradients, no glassy panels, no "AI purple".
- Both light and dark are first-class. Dark is a different paper, not an inverted light theme.

## Visual attributes

| Attribute | Recommendation |
| --- | --- |
| Density | Compact by default. Timeline rows 8px vertical padding, 14px body text, 20px line height. A comfortable density toggle can come later; do not design two densities now |
| Hierarchy | Four levels: room title, item title (task or run name), body, meta. Meta is small uppercase kicker text for kinds and states |
| Surfaces | Three levels only: base (page), raised (cards, pane), overlay (sheets, modals). Each level is one neutral surface color with one neutral hairline border. No shadows on raised; a soft 1px-blur shadow only on overlay |
| Borders and radius | Every border is a 1px neutral hairline. Radius 6px on cards and panes, 4px on controls, 999px on badges and avatars. Never a colored border, outline, ring, or left bar, in any state |
| Selection | A shifted neutral surface, heavier type, and a checkmark glyph. Never an outline |
| Focus | A 2px ring in the primary ink color with 2px offset, on every focusable element. Neutral, high contrast, visible in both modes |
| Dividers | Hairlines between timeline items and table rows instead of gaps between floating cards |
| Iconography | One 16px monochrome stroke set at 1.5px weight. Every state glyph is paired with a word. Glyph vocabulary: live dot (running), check (pass), cross (fail), dash (blocked), question (unavailable), clock (waiting), lock (authority), shield (trusted CI), person (owner), chip (delegate), archive box (historical) |
| Illustration | None in S1. Empty states are one sentence |
| Motion | 120ms to 180ms ease-out for panes and sheets. A slow two-second pulse on the live glyph only. Reduced motion removes the pulse and replaces slides with fades |

## Typography roles

| Role | Use | Starting choice |
| --- | --- | --- |
| UI sans | Everything that is not data | A humanist sans with tabular figures, such as Inter or IBM Plex Sans, 14px body, 13px meta, 16px item titles, 20px room title |
| Mono data | Identifiers, digests, commit hashes, paths, commands, output, diffs, reason codes | A monospace with clear zero and one, such as IBM Plex Mono or JetBrains Mono, 13px |
| Kicker | Record kind and state labels | UI sans, 11px, uppercase, letter-spacing 0.06em, secondary ink |
| Quote | A human's exact decision words | UI sans, 14px, with a hairline left rule in ink, not in accent |

## Color roles

Starting values, checked for AA contrast against their intended surfaces. Every role has a light and a dark value; the dark set is retuned, not inverted.

| Role | Light | Dark | Used for |
| --- | --- | --- | --- |
| Base surface | `#F6F5F2` | `#16171A` | Page background |
| Raised surface | `#FFFFFF` | `#1E2024` | Cards, panes, composer |
| Overlay surface | `#FFFFFF` | `#24262B` | Sheets, modals |
| Selected surface | `#EAE8E2` | `#2A2D33` | Selected row, active nav item |
| Hairline | `#DAD8D2` | `#33363C` | Every border and divider |
| Ink primary | `#1B1A17` | `#ECEAE4` | Body text, titles, focus ring |
| Ink secondary | `#5C5A54` | `#A9A69E` | Meta, kickers, timestamps |
| Ink muted | `#75726A` | `#7C7970` | Disabled text, placeholders |
| Live signal | `#C2410C` | `#F0793A` | Running state glyph, live countdown, unread count. Nothing else |
| Pass mark | `#1F7A4D` | `#4CC38A` | The check glyph only, never a fill or border |
| Fail mark | `#B42318` | `#F0716B` | The cross glyph and destructive button text only |
| Diff added | `#E6F4EA` | `#17321F` | Added line background, with a `+` gutter glyph |
| Diff removed | `#FBE9E7` | `#3A1B18` | Removed line background, with a `-` gutter glyph |

Semantics: a state is carried by its word and glyph. Color reinforces at most one of them. A success box and an error box differ by glyph and word, and still work in greyscale. Never tint a fill and border it in the same color. Never cycle a color per item.

## Data visualization

Budget and progress meters are a flat neutral track with flat neutral segments separated by a hairline and named in a legend: reserved, used, remaining. No hue ramp. Execution and verification budgets are two separate meters. Durations use tabular figures. There are no charts in S1 beyond meters and countdowns.

## Code and evidence treatment

Code blocks, command output, and diffs use the mono role on the raised surface with a hairline border, line numbers in secondary ink, and a visible truncation marker line when output was cut. Digests show the first 12 characters with a copy control and the full value on focus. Diffs use the added and removed backgrounds together with gutter glyphs so the difference survives greyscale. Artifacts open in a viewer, never inline for HTML or SVG.

## Empty and error states

An empty state is one sentence that says what is true and what would change it, for example "No runs yet. Create a task from a thread to launch one." An error state names the reason code in mono, says what was observed, says what to do, and shows the correlation ID in small mono for support. Neither uses illustration in S1.

## Light and dark strategy

Follow the system preference by default with a manual override stored per browser. Define every color as a role token and give each role a value per mode. Test every screen in both modes at both viewports. The live signal hue is retuned per mode so it keeps at least 3:1 against its surface. Diff backgrounds and the pass and fail marks also carry per-mode values.

## Starting tokens versus brand decisions

| Item | Decision state |
| --- | --- |
| Surface, ink, hairline, and signal values above | Starting tokens. Adjust freely within AA |
| Type families named above | Starting choices. Final family and licensing are a brand decision |
| Radius, density, focus ring, glyph set | Starting tokens |
| Wordmark, logotype, favicon, marketing palette | Undecided. Not needed for the first prototype |
| Whether the live signal is orange or another hue | Starting token. Keep it a single hue that does not read as success or failure |
| Sound, haptics, notifications styling | Out of scope in S1 |
