import MarkdownIt from 'markdown-it';

export const statuses = ['Built', 'In progress', 'Planned', 'Deferred', 'Not started'];
export const sections = ['What it is', 'What it does', 'Why it exists', 'How it works', 'Implementation status', 'Verification and proof'];
export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ +/g, '-');
const md = new MarkdownIt();
export function links(content) {
	const result = [];
	function visit(tokens) {
		for (const t of tokens) {
			if (t.type === 'link_open') result.push(t.attrGet('href'));
			if (t.type === 'image') result.push(t.attrGet('src'));
			if (t.children) visit(t.children);
		}
	}
	visit(md.parse(content, {}));
	return result;
}
export function headings(content) {
	return [...content.matchAll(/^#{1,6} (.+)$/gm)].map(m => slug(m[1]));
}
export function validateSite({ pages, atlas, expectedMilestones, inventory, documentedInventory, sources, featurePages = [], expectedMilestoneDetails = [] }) {
	const errors = [];
	for (const p of pages) {
		if (/\/Users\/|\/home\/|file:\/\//.test(p.content)) errors.push(`${p.id}: private path`);
		if (p.kind === 'feature') {
			for (const s of sections) if (!new RegExp(`^## ${s}\\n\\n\\S`, 'm').test(p.content)) errors.push(`${p.id}: section ${s}`);
			if (!/```flow\n(?:[^\n]+\|[^\n]+\n){2,}```/.test(p.content)) errors.push(`${p.id}: visual required`);
		}
		for (const href of links(p.content)) {
			if (/^https?:\/\//.test(href)) continue;
			if (href.startsWith('repo:')) {
				if (!sources.includes(href.slice(5))) errors.push(`${p.id}: source ${href}`);
				continue;
			}
			const [file, anchor] = href.split('#');
			const target = pages.find(v => v.id === (file ? file.replace(/\.md$/, '') : p.id));
			if (!target || (anchor && !headings(target.content).includes(anchor))) errors.push(`${p.id}: link ${href}`);
		}
	}
	if (!/^[a-f0-9]{7,40}$/.test(atlas.revision) || !/^\d{4}-\d{2}-\d{2}$/.test(atlas.date)) errors.push('snapshot revision/date required');
	for (const item of [...atlas.features, ...atlas.milestones]) {
		if (!statuses.includes(item.status)) errors.push(`${item.id}: invalid status`);
		if (item.status === 'Built' && (!item.proof?.some(p => /\/src\/|\/tools\//.test(p)) || !item.proof?.some(p => /\/test\//.test(p)) || !item.proof?.some(p => p.startsWith('repo:evidence/')))) errors.push(`${item.id}: Built proof requires code, test and evidence`);
		for (const proof of item.proof ?? []) if (!sources.includes(proof.slice(5))) errors.push(`${item.id}: missing proof source ${proof}`);
	}
	const ids = atlas.milestones.map(m => m.id).sort();
	if (JSON.stringify(ids) !== JSON.stringify([...expectedMilestones].sort())) errors.push('milestone coverage differs from authoritative plan');
	for (const m of atlas.milestones) {
		if (!m.outcome?.trim()) errors.push(`${m.id}: outcome required`);
		if (!['S1', 'S2', 'S3'].includes(m.stage)) errors.push(`${m.id}: stage required`);
	}
	for (const expected of expectedMilestoneDetails) {
		const actual = atlas.milestones.find(m => m.id === expected.id);
		if (actual && (actual.outcome !== expected.outcome || actual.stage !== expected.stage)) errors.push(`${expected.id}: milestone outcome drift`);
	}
	for (const path of inventory) if (!documentedInventory.includes(path)) errors.push(`inventory missing: ${path}`);
	for (const home of featurePages) if (!pages.some(p => `docs/site/${p.id}.md` === home && p.kind === 'feature')) errors.push(`feature documentation missing: ${home}`);
	return errors;
}
