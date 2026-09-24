import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, rmSync } from 'node:fs';
import { createWireValidator, type Schema } from '@agora/contracts';
import { RoomClient } from './local-room-client.ts';
import { authenticate, available, fileId, loadOwner, pause, rootFor, safeTree, saveOwner, stopped, type Owner } from './local-room-owner.ts';

const args = process.argv.slice(2), command = args[0] as Schema<'LocalRuntimeReport'>['command'];
if (args[0] === '--help' || args[0] === '--version') {
	process.stdout.write(args[0] === '--version' ? 'agora.local-runtime/v1\n' : 'local-room doctor|start|status|send|answer|history|replay|evidence|stop|reset [--instance NAME] [--port PORT] [--body TEXT] [--selected-id UUID] [--command-id UUID] [--after CURSOR] [--confirm-disposable]\n'); process.exit(0);
}
const option = (name: string): string | undefined => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const report: Schema<'LocalRuntimeReport'> = { schema_version: 'agora.local-runtime/v1', command, outcome: 'pass', detail: '' };
const wire = createWireValidator();
let lock: string | undefined;
let exit = 2;
try {
	if (!['doctor', 'start', 'status', 'send', 'answer', 'history', 'replay', 'evidence', 'stop', 'reset'].includes(command)) { report.command = 'unknown'; exit = 64; throw new Error('usage: local-room doctor|start|status|send|answer|history|replay|evidence|stop|reset --instance NAME'); }
	for (let i = 1; i < args.length; i++) {
		const flag = args[i];
		if (!flag || !['--instance', '--port', '--body', '--selected-id', '--command-id', '--after', '--confirm-disposable'].includes(flag) || flag !== '--confirm-disposable' && (args[++i] === undefined || args[i]?.startsWith('--'))) { exit = 64; throw new Error('unknown flag or missing value'); }
	}
	if (command === 'doctor') {
		const version = spawnSync(process.env['AGORA_PG_BIN'] ? `${process.env['AGORA_PG_BIN']}/pg_ctl` : 'pg_ctl', ['--version'], { encoding: 'utf8', timeout: 2000 });
		if (!process.version.startsWith("v24.") || version.status !== 0 || !version.stdout.includes('18.')) throw new Error('Node 24 and PostgreSQL 18 required');
		report.detail = `${process.version}; ${version.stdout.trim()}; private loopback cluster, agora_app product role`;
	} else {
		const root = rootFor(option('--instance') ?? 'development');
		if (['start', 'stop', 'reset'].includes(command)) { mkdirSync(`${root}.lock`, { mode: 0o700 }); lock = `${root}.lock`; }
		if (command === 'start') {
			let previous: Owner | undefined;
			if (existsSync(root)) { previous = loadOwner(root); await stopped(previous); safeTree(root); }
			const requested = Number(option('--port') ?? (previous ? new URL(previous.url).port : 0));
			if (!Number.isInteger(requested) || requested < 0 || requested > 65535) { exit = 64; throw new Error('invalid port'); }
			const port = await available(requested), pgPort = await available(previous?.postgres_port);
			if (port === pgPort) throw new Error('listener allocation collision; retry start');
			if (!existsSync(root)) mkdirSync(root, { mode: 0o700 });
			const owner: Owner = { root, rootId: fileId(root), dataId: previous?.dataId ?? '', launch: randomUUID(), secret: randomBytes(32).toString('hex'), state: 'starting', url: `http://127.0.0.1:${port}`, postgres_port: pgPort, center_pid: 0, postgres_pid: 0 };
			saveOwner(owner);
			const log = openSync(`${root}/runtime.log`, 'a', 0o600);
			const child = spawn(process.execPath, ['scripts/local-room-service.ts', root], { detached: true, stdio: ['ignore', log, log, 'ipc'] }); closeSync(log);
			const cancel = (): void => { child.kill('SIGTERM'); };
			process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
			await new Promise<void>((yes, no) => {
				const timeout = setTimeout(() => { child.kill('SIGTERM'); no(new Error('startup timeout; inspect retained ownership and log')); }, 35_000);
				child.once('error', (e) => { clearTimeout(timeout); no(e); });
				child.once('exit', () => { clearTimeout(timeout); no(new Error('startup failed; inspect retained runtime.log')); });
				child.once('message', (m: unknown) => { clearTimeout(timeout); if (m === 'ready') yes(); else no(new Error('startup failed; inspect retained runtime.log')); });
			}).finally(() => { process.off('SIGINT', cancel); process.off('SIGTERM', cancel); if (child.connected) child.disconnect(); child.unref(); });
		}
		const owner = loadOwner(root);
		report.root = root; report.launch = owner.launch; report.url = owner.url;
		if (owner.center_pid) report.center_pid = owner.center_pid;
		if (owner.postgres_pid) report.postgres_pid = owner.postgres_pid;
		report.postgres_port = owner.postgres_port;
		if (command === 'reset') {
			if (!args.includes('--confirm-disposable')) { exit = 64; throw new Error('reset requires --confirm-disposable'); }
			await stopped(owner); safeTree(root); rmSync(root, { recursive: true }); report.detail = 'owned disposable data removed; listeners absent';
		} else if (owner.state === 'stopped') {
			await stopped(owner); report.detail = 'stopped; data retained';
			if (!['status', 'stop', 'evidence'].includes(command)) throw new Error('start the runtime first');
		} else {
			await authenticate(owner);
			if (command === 'stop') {
				const response = await fetch(`${owner.url}/_runtime/stop`, { method: 'POST', headers: { authorization: `Bearer ${owner.secret}` }, signal: AbortSignal.timeout(2000) });
				if (!response.ok) throw new Error('stop refused');
				for (let i = 0; i < 100 && loadOwner(root).state !== 'stopped'; i++) await pause(100);
				await stopped(loadOwner(root)); report.detail = 'owned listeners stopped; data retained';
			} else {
				const client = new RoomClient(owner.url);
				if (command === 'send') {
					const snapshot = await client.request('snapshot') as Schema<'RoomSnapshot'>;
					report.receipt = await client.send({ schema_version: 'agora.local-room.send-message/v1', command_id: option('--command-id') ?? randomUUID(), scope: snapshot.scope, body: option('--body') ?? '', citations: [] });
				} else if (command === 'answer') {
					const selected = option('--selected-id');
					const snapshot = await client.request('snapshot') as Schema<'RoomSnapshot'>;
					const payload: Schema<'LocalAnswerCommand'> = { schema_version: 'agora.local-answer.command/v1', command_id: option('--command-id') ?? randomUUID(), scope: snapshot.scope, selected_ids: selected ? [selected] : [] };
					const checked = wire.validate('LocalAnswerCommand', payload);
					if (!checked.ok) { exit = 64; throw new Error(checked.details.join(';')); }
					report.receipt = await client.request('answer', undefined, checked.value) as Schema<'RoomCommandReceipt'>;
				} else if (command === 'replay') report.events = await client.request(`events?after=${encodeURIComponent(option('--after') ?? '0')}`) as Schema<'RoomEventBatch'>;
				else if (command === 'history' || command === 'evidence') report.snapshot = await client.request('snapshot') as Schema<'RoomSnapshot'>;
				report.detail = 'running; loopback-only development harness';
			}
		}
	}
} catch (e) { report.outcome = exit === 64 ? 'usage_error' : 'blocked'; report.detail = String(e).slice(0, 4096); process.exitCode = exit; }
finally { if (lock) rmSync(lock, { recursive: true }); }
const valid = wire.validate('LocalRuntimeReport', report);
if (!valid.ok) { process.stderr.write(`${valid.details.join(';')}\n`); process.exitCode = 70; }
process.stdout.write(`${JSON.stringify(report)}\n`);
