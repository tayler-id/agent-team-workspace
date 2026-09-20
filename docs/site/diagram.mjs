// Layout is presentation only. All labels, links and relationships come from atlas.json.
export function systemDiagram(atlas, escape) {
	if (!atlas.nodes.length) return '';
	const position = { browser: [20, 20], native: [20, 155], local: [20, 290], cloud: [20, 425], center: [340, 155], postgres: [660, 20], artifacts: [660, 155], github: [660, 425], agents: [340, 425] };
	const height = Math.max(...atlas.nodes.map(n => position[n.id][1])) + 125;
	const description = atlas.edges.map(([from, to, label]) => `${atlas.nodes.find(n => n.id === from).title} to ${atlas.nodes.find(n => n.id === to).title}: ${label}`).join('. ');
	const paths = atlas.edges.map(([from, to]) => {
		const [x, y] = position[from];
		const [tx, ty] = position[to];
		if (to === 'github') return `<path d="M ${x + 110} ${y + 105} V 410 H ${tx + 110} V ${ty}"/>`;
		if (from === 'agents') return `<path d="M ${x + 110} ${y} V ${ty + 105}"/>`;
		const rightward = tx > x;
		const start = x + (rightward ? 220 : 0), end = tx + (rightward ? 0 : 220), middle = (start + end) / 2;
		return `<path d="M ${start} ${y + 52} H ${middle} V ${ty + 52} H ${end}"/>`;
	}).join('');
	const nodes = atlas.nodes.map(n => {
		const [x, y] = position[n.id];
		const words = n.title.split(' '), first = words.slice(0, 2).join(' '), second = words.slice(2).join(' ');
		return `<g transform="translate(${x} ${y})"><rect width="220" height="105" rx="7"/><text x="14" y="24" class="svg-status">${escape(n.availability)}</text><text x="14" y="52">${escape(first)}</text><text x="14" y="74">${escape(second)}</text></g>`;
	}).join('');
	return `<figure class="network-figure"><figcaption>Authority stays at the center. Execution stays outside.</figcaption><svg viewBox="0 0 900 ${height}" role="img" aria-labelledby="system-title system-desc"><title id="system-title">Agora target system connections</title><desc id="system-desc">${escape(description)}. Availability and full connection labels follow in text.</desc><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="#708c7e"/></marker></defs><g class="network-lines">${paths}</g>${nodes}</svg></figure>`;
}
