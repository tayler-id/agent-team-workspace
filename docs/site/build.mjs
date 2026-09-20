import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { links, headings, slug, validateSite } from './validate.mjs';
import { outputLinks } from './output-links.mjs';
import { companion, escape, markdown, shell, sourceUrl as fileSourceUrl } from './render.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const source = path.join(root, 'docs/site');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const sourceUrl = (p) => fileSourceUrl(p.replace(/\/$/, ''));
function pageMarkdown(atlas, inventory, sourcePath) {
	const md = markdown(atlas, inventory);
	const original = md.renderer.rules.link_open;
	md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
		const href = tokens[idx].attrGet('href');
		if (/^https?:\/\//.test(href)) return self.renderToken(tokens, idx, options);
		if (!sourcePath) return original(tokens, idx, options, env, self);
		const [file, fragment] = href.split('#');
		const target = file ? path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), file)) : sourcePath;
		tokens[idx].attrSet('href', path.posix.relative(path.posix.dirname(sourceUrl(sourcePath)), sourceUrl(target)) + (fragment ? `#${fragment}` : ''));
		return self.renderToken(tokens, idx, options);
	};
	return md;
}
export function build({ check = false, mirror = false } = {}) {
	const site = json('docs/site/site.json');
	const atlas = json('docs/site/atlas.json');
	const mirrored = companion(atlas);
	if (mirror) writeFileSync(path.join(source, 'progress.md'), mirrored);
	const pages = site.groups.flatMap(g => g.pages).map(p => ({ ...p, content: read(`docs/site/${p.id}.md`) }));
	const plan = read('docs/implementation-plan.md');
	const expectedMilestoneDetails = [...plan.matchAll(/^## .+ \((U\w+)\)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)].map(m => ({ id: m[1], stage: m[2].match(/Stage (S\d)/)[1], outcome: m[2].match(/\*\*You see\.\*\*\s*- \[ \] (.*?) Save /)[1] }));
	const expectedMilestones = expectedMilestoneDetails.map(m => m.id);
	const packages = ['apps', 'packages'].flatMap(dir => readdirSync(path.join(root, dir)).filter(p => existsSync(path.join(root, dir, p, 'package.json'))).map(p => `${dir}/${p}`));
	const inventory = ['contracts', ...packages, ...readdirSync(path.join(root, 'scripts')).filter(p => /\.(mjs|ts)$/.test(p)).map(p => `scripts/${p}`), ...readdirSync(source).filter(p => p.endsWith('.mjs')).map(p => `docs/site/${p}`)];
	const handoff = path.join(root, 'docs/design-handoff');
	const handoffFiles = existsSync(handoff) ? readdirSync(handoff).filter(p => p.endsWith('.md')).map(p => `docs/design-handoff/${p}`) : [];
	const handoffRefs = handoffFiles.flatMap(file => links(read(file)).filter(href => !/^https?:\/\//.test(href)).map(href => `repo:${path.posix.normalize(path.posix.join(path.posix.dirname(file), href.split('#')[0] || path.posix.basename(file)))}`));
	const refs = [...new Set([...pages.flatMap(p => links(p.content)), ...atlas.features.flatMap(f => f.proof), 'repo:docs/implementation-plan.md', ...handoffFiles.map(f => `repo:${f}`), ...handoffRefs].filter(p => p.startsWith('repo:')).map(p => p.slice(5)))];
	const sources = refs.filter(p => !p.includes('..') && /^(docs|apps|packages|contracts|scripts|evidence|agora)\/|^(AGENTS.md|package.json|\.agents\/skills\/verify-agora\/SKILL.md)$/.test(p) && existsSync(path.join(root, p)));
	const validationPages = pages.map(p => p.id === 'atlas' ? { ...p, content: `${p.content}\n## System map\n## Roadmap\n` } : p);
	const featurePages = json('agora/feature-map.json').features.map(f => f.documentation);
	const errors = validateSite({ pages: validationPages, atlas, expectedMilestones, inventory, documentedInventory: site.inventory.map(i => i.path), sources, featurePages, expectedMilestoneDetails });
	for (const item of [...atlas.nodes, ...site.inventory, ...atlas.features]) if (!pages.some(p => `${p.id}.md` === item.page)) errors.push(`missing navigation home: ${item.page}`);
	for (const f of atlas.features.filter(f => f.status === 'Built')) for (const p of f.proof) {
		try { execFileSync('git', ['cat-file', '-e', `${atlas.revision}:${p.slice(5)}`], { cwd: root, stdio: 'pipe' }); } catch { errors.push(`Built source not committed at snapshot: ${p}`); }
	}
	if (!existsSync(path.join(source, 'progress.md')) || read('docs/site/progress.md') !== mirrored) errors.push('atlas companion drift: run pnpm docs:atlas');
	if (errors.length) throw new Error(errors.join('\n'));
	if (check) return { outcome: 'pass', pages: pages.length, milestones: expectedMilestones.length };
	const out = path.join(root, '.docs-dist');
	rmSync(out, { recursive: true, force: true });
	mkdirSync(out, { recursive: true });
	const md = pageMarkdown(atlas, site.inventory);
	for (const p of pages) {
		let content = md.render(p.content);
		if (p.id === 'handoff' && handoffFiles.length) content += `<h2 id="packet">Committed design packet</h2><ul>${handoffFiles.map(f => `<li><a href="${sourceUrl(f)}">${escape(path.basename(f, '.md'))}</a></li>`).join('')}</ul>`;
		const toc = [...content.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)].map(m => ({ id: m[1], title: m[2] }));
		writeFileSync(path.join(out, `${p.id}.html`), shell(p, content, site, toc));
	}
	for (const file of sources) {
		const target = path.join(out, sourceUrl(file));
		mkdirSync(path.dirname(target), { recursive: true });
		const prefix = '../'.repeat(sourceUrl(file).split('/').length - 1);
		const directory = statSync(path.join(root, file)).isDirectory();
		const text = directory ? '' : read(file).replace(/\/(?:Users|home)\/[^\s"'<>]+/g, '[local path redacted]');
		const body = directory ? `<h1>Repository directory</h1><p>This is an ownership boundary, not a copy of the entire directory. Only individually linked, reviewed records are published here. Use a repository checkout for the full tree.</p><ul>${sources.filter(f => f !== file && f.startsWith(file.endsWith('/') ? file : `${file}/`)).map(f => `<li><a href="${path.posix.relative(path.posix.dirname(sourceUrl(file)), sourceUrl(f))}">${escape(f)}</a></li>`).join('')}</ul>` : handoffFiles.includes(file) ? pageMarkdown(atlas, site.inventory, file).render(text) : `<h1>Source record</h1><pre class="source-record">${text.split('\n').map(line => `${line.match(/^#{1,6} (.+)$/) ? `<span id="${slug(line.replace(/^#+ /, ''))}"></span>` : ''}${escape(line)}`).join('\n')}</pre>`;
		const toc = handoffFiles.includes(file) ? [...body.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)].map(m => ({ id: m[1], title: m[2] })) : [];
		writeFileSync(target, shell({ title: file, id: handoffFiles.includes(file) ? 'handoff' : 'source' }, `<p><code>${escape(file)}</code></p><p>Repository-owned source. Historical receipts are not a fresh verification claim.</p>${body}`, site, toc, prefix));
	}
	writeFileSync(path.join(out, 'progress.md'), mirrored);
	writeFileSync(path.join(out, 'style.css'), read('docs/site/style.css'));
	const files = [...pages.map(p => `${p.id}.html`), ...sources.map(sourceUrl), 'style.css', 'progress.md'];
	const broken = outputLinks(new Map(files.map(f => [f, readFileSync(path.join(out, f), 'utf8')])));
	if (broken.length) throw new Error(broken.join('\n'));
	return { outcome: 'pass', pages: pages.length, milestones: expectedMilestones.length, output: '.docs-dist', sections: headings(pages[0].content).length };
}
if (process.argv[1] === import.meta.filename) {
	try { console.log(JSON.stringify(build({ check: process.argv.includes('--check'), mirror: process.argv.includes('--mirror') }))); }
	catch (error) { console.error(error.message); process.exitCode = 1; }
}
