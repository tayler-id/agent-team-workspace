import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

const canonical = path.resolve('.agents/skills');
const retired = ['skills', '.adal', '.aider-desk', '.augment', '.autohand', '.bob', '.codeartsdoer', '.codebuddy', '.codemaker', '.codestudio', '.commandcode', '.continue', '.cortex', '.crush', '.devin', '.forge', '.fx', '.goose', '.grok', '.hermes', '.iflow', '.inferencesh', '.jazz', '.junie', '.kimchi', '.kiro', '.kode', '.lingma', '.mcpjam', '.minimax', '.moxby', '.mux', '.neovate', '.ona', '.openhands', '.pi', '.pochi', '.posit', '.qoder', '.qwen', '.reasonix', '.roo', '.rovodev', '.tabnine', '.terramind', '.tinycloud', '.trae', '.vibe', '.windsurf', '.zcode', '.zencoder'];

test('every Claude skill resolves to its unchanged canonical source', () => {
	const names = readdirSync(canonical).filter(name => lstatSync(path.join(canonical, name)).isDirectory()).sort();
	expect(names).toContain('verify-agora');
	expect(readdirSync('.claude/skills').sort()).toEqual(names);
	for (const name of names) {
		const source = path.join(canonical, name), pointer = path.resolve('.claude/skills', name);
		expect(lstatSync(pointer).isSymbolicLink(), name).toBe(true);
		expect(realpathSync(pointer), name).toBe(source);
		expect(readFileSync(path.join(pointer, 'SKILL.md')), name).toEqual(readFileSync(path.join(source, 'SKILL.md')));
	}
});

test('retired skill copies and unused integration roots stay absent', () => {
	for (const name of retired) expect(lstatSync(name, { throwIfNoEntry: false }), name).toBeUndefined();
});

test('required repository and active tool configuration remains', () => {
	for (const name of ['.agents', '.claude', '.git', '.github', '.githooks', '.gitignore', '.gitattributes', '.markdownlint.json', '.node-version', '.npmrc']) {
		expect(lstatSync(name, { throwIfNoEntry: false }), name).toBeDefined();
	}
	expect(readFileSync('.agents/skills/verify-agora/SKILL.md', 'utf8')).toContain('name: verify-agora');
});
