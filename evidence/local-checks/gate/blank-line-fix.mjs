// One-off: insert the blank lines MD022 and MD032 ask for in the supplied design-handoff READMEs.
// Each file is rewritten only after the fixed text passes both guards in memory:
//   1. the non-blank lines are byte-identical to the original, in order;
//   2. markdownlint finds no MD022/MD032 in the fixed text.
// Usage: node evidence/local-checks/gate/blank-line-fix.mjs FILE...
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
// markdownlint is a dependency of markdownlint-cli2, so resolve it from there.
const require = createRequire(createRequire(import.meta.url).resolve('markdownlint-cli2'));
const { lint } = require('markdownlint/promise');
const { applyFixes } = require('markdownlint');
const config = { default: false, MD022: true, MD032: true };
const nonBlank = text => text.split('\n').filter(line => line.trim() !== '');
for (const file of process.argv.slice(2)) {
	const original = readFileSync(file, 'utf8');
	const found = (await lint({ strings: { f: original }, config })).f;
	if (!found.length) { console.log(`skip  ${file}`); continue; }
	const fixed = applyFixes(original, found);
	if (JSON.stringify(nonBlank(fixed)) !== JSON.stringify(nonBlank(original))) { console.error(`REFUSED ${file}: non-blank lines would change`); process.exitCode = 1; continue; }
	if ((await lint({ strings: { f: fixed }, config })).f.length) { console.error(`REFUSED ${file}: still failing after fix`); process.exitCode = 1; continue; }
	writeFileSync(file, fixed);
	console.log(`fixed ${file} (${found.length} findings)`);
}
