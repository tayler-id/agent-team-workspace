import path from 'node:path';

// Check the actual generated artifact, including navigation, atlas and stylesheet links.
export function outputLinks(files) {
	const errors = [];
	for (const [file, content] of files) {
		if (!file.endsWith('.html')) continue;
		for (const [, href] of content.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
			if (/^https?:\/\//.test(href)) continue;
			const [name, fragment] = href.split('#');
			const target = name ? path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURIComponent(name))) : file;
			if (!files.has(target) || (fragment && !files.get(target).includes(`id="${fragment}"`))) errors.push(`${file}: broken output link ${href}`);
		}
	}
	return errors;
}
