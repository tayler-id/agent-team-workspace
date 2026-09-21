import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';

export interface Owner {
	root: string; rootId: string; dataId: string; launch: string; secret: string;
	state: 'starting' | 'running' | 'stopped'; url: string; postgres_port: number; center_pid: number; postgres_pid: number;
}
export const fileId = (path: string): string => { const s = lstatSync(path); return `${s.dev}:${s.ino}`; };
export function safeTree(path: string): void {
	const s = lstatSync(path);
	if (s.isSymbolicLink()) throw new Error('foreign symlink refused');
	if (s.isDirectory()) for (const child of readdirSync(path)) safeTree(`${path}/${child}`);
}
export function rootFor(instance: string): string {
	if (realpathSync('.') !== resolve(import.meta.dirname, '..')) throw new Error('run from the owning worktree root');
	if (!/^[a-z0-9-]{1,60}$/.test(instance)) throw new Error('invalid instance');
	const scratch = resolve('.scratch');
	if (!existsSync(scratch)) mkdirSync(scratch, { mode: 0o700 });
	if (realpathSync(scratch) !== scratch) throw new Error('foreign scratch path');
	return resolve(scratch, `local-room-${instance}`);
}
export function loadOwner(root: string): Owner {
	if (realpathSync(root) !== root) throw new Error('foreign root path');
	const o = JSON.parse(readFileSync(`${root}/owner.json`, 'utf8')) as Owner;
	if (o.root !== root || o.rootId !== fileId(root) || !/^[a-f0-9]{64}$/.test(o.secret) || !/^[a-f0-9-]{36}$/.test(o.launch)) throw new Error('foreign owner record');
	if (o.dataId && (!existsSync(`${root}/data`) || realpathSync(`${root}/data`) !== `${root}/data` || o.dataId !== fileId(`${root}/data`))) throw new Error('foreign database path');
	if (!/^http:\/\/127\.0\.0\.1:[0-9]+$/.test(o.url) || !Number.isInteger(o.postgres_port) || o.postgres_port < 1 || o.postgres_port > 65535) throw new Error('foreign listener record');
	return o;
}
export function saveOwner(o: Owner): void {
	const temp = `${o.root}/owner-${o.launch}.tmp`;
	writeFileSync(temp, JSON.stringify(o), { mode: 0o600 }); renameSync(temp, `${o.root}/owner.json`);
}
export const proof = (o: Owner, nonce: string): string => createHmac('sha256', o.secret).update(`${o.launch}:${o.root}:${o.url}:${o.postgres_port}:${o.center_pid}:${o.postgres_pid}:${nonce}`).digest('hex');
export async function authenticate(o: Owner): Promise<void> {
	const nonce = randomBytes(32).toString('hex');
	const response = await fetch(`${o.url}/_runtime/identity?nonce=${nonce}`, { signal: AbortSignal.timeout(2000) });
	if (response.headers.get('x-agora-proof') !== proof(o, nonce)) throw new Error('foreign runtime challenge');
}
export async function available(port = 0): Promise<number> {
	const server = createServer();
	return new Promise((yes, no) => {
		server.once('error', no);
		server.listen(port, '127.0.0.1', () => {
			const address = server.address();
			server.close(() => { if (typeof address === 'object' && address) yes(address.port); else no(new Error('no listener')); });
		});
	});
}
export async function stopped(o: Owner): Promise<void> {
	if (o.state !== 'stopped' || existsSync(`${o.root}/data/postmaster.pid`)) throw new Error('not proven stopped');
	await available(Number(new URL(o.url).port)); await available(o.postgres_port);
}
export const pause = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
