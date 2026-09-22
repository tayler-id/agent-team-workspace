// Deterministic 50,000-message corpus: each sequence number maps to one body, so every run, viewport and browser
// sees identical rows. Covers short and long prose, Markdown, code fences, emoji, Latin, Cyrillic, Greek, CJK,
// Devanagari, Arabic and Hebrew (RTL), plus hostile HTML and URLs that must render as text.
const prose = ['Ship the smallest change that proves the point.', 'The replay floor moved, so the client asked for a fresh snapshot instead of guessing.', 'Rows are estimated, then measured; the estimate only has to be close enough that the scrollbar stays honest.'];
const long = 'A long message wraps many times at phone width. It carries several sentences so the estimate has to count lines, not characters, and it ends with a number: ';
const scripts = ['Привет, мир. Строки на кириллице переносятся по словам.', 'Γεια σου κόσμε. Οι ελληνικές λέξεις αναδιπλώνονται κανονικά.', '日本語と中文のテキストは単語間の空白なしで折り返されます。虚拟化必须处理这种情况。', 'नमस्ते दुनिया। देवनागरी लिपि में लंबी पंक्तियाँ भी सही ढंग से लपेटी जाती हैं।', 'مرحبا بالعالم. هذا النص يكتب من اليمين إلى اليسار ويجب أن يظل مقروءا.', 'שלום עולם. טקסט זה נכתב מימין לשמאל ונשמר קריא בכל רוחב.'];
const emoji = ['🚀 Deploy went out 🎉 and nothing paged 🙏', '👩‍💻👨🏽‍💻 pairing on the sizer; 🐛 found, 🧪 written, ✅ green'];
const code = ['```ts\nexport function synchronize(state: ClientState, input: ClientInput): Transition {\n\tconst next = apply(state, input);\n\treturn { state: freeze(next), requests: [], acknowledgements: [] };\n}\n```', '```sql\nSELECT message_id, created_seq, revision\nFROM local_room.messages\nWHERE room_id = $1 AND created_seq > $2\nORDER BY created_seq\nLIMIT 500;\n```'];
const markdown = ['## Plan\n\n- estimate with Pretext\n- measure mounted rows\n- **never** let the engine own scrolling', '1. Load the room\n2. Jump to message 25,000\n3. Resize to 390px\n\n> The anchored row must not move.'];
const hostile = ['<img src=x onerror="alert(1)"> is text, not an element', '[click](javascript:alert(1)) and javascript:alert(1) stay inert', '<script>alert(1)</script><a href="https://example.test">not a link</a>'];

export function corpusBody(seq: number): string {
	switch (seq % 12) {
		case 0: return `${prose[seq % prose.length] ?? ''} (#${seq})`;
		case 1: return `${long}${seq}. ${long}${seq * 2}.`;
		case 2: return `${scripts[seq % scripts.length] ?? ''} #${seq}`;
		case 3: return `${emoji[seq % emoji.length] ?? ''} #${seq}`;
		case 4: return `Before the block #${seq}\n${code[seq % code.length] ?? ''}\nAfter the block.`;
		case 5: return `${markdown[seq % markdown.length] ?? ''}\n\nNote #${seq}`;
		case 6: return `${scripts[(seq + 3) % scripts.length] ?? ''}\n${prose[seq % prose.length] ?? ''} #${seq}`;
		case 7: return `${hostile[seq % hostile.length] ?? ''} #${seq}`;
		case 8: return `Short #${seq}`;
		case 9: return `${long}${seq}.\n\n${long}${seq + 1}.\n\n${long}${seq + 2}.`;
		case 10: return `Mixed ${scripts[seq % 2] ?? ''} ${emoji[0] ?? ''} ${prose[1] ?? ''} #${seq}`;
		default: return `Line one #${seq}\nLine two\nLine three`;
	}
}
// Every 97th message is a tombstone, so dynamic rows are spread through the whole corpus.
export const corpusTombstone = (seq: number): boolean => seq % 97 === 0;
