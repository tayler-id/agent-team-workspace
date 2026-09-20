import { createServer } from 'node:http';
import { URL } from 'node:url';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { build } from './build.mjs';

const root = path.resolve(import.meta.dirname, '../../.docs-dist');
const port = Number(process.env.DOCS_PORT ?? 4173);
build();
const server = createServer((req, res) => {
	try {
		const url = new URL(req.url, 'http://localhost');
		const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
		const file = path.resolve(root, `.${name}`);
		if (!file.startsWith(`${root}/`) || !statSync(file).isFile()) { res.writeHead(404).end('Not found'); return; }
		if (name.endsWith('.html')) build();
		res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/plain; charset=utf-8' })[path.extname(file)] ?? 'text/plain');
		res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'");
		res.end(readFileSync(file));
	} catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500).end(error.code === 'ENOENT' ? 'Not found' : 'Documentation build failed. Inspect terminal.'); console.error(error.message); }
});
server.listen(port, '127.0.0.1', () => console.log(`Agora docs: http://127.0.0.1:${port} (Ctrl+C stops this process)`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
