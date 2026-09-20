import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from 'vitest';

const source = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
const setup = `const s={type:'snapshot',streamId:'room',cursor:'1',lastSeen:'0',messages:[{id:'m',createdSeq:'1',revision:'1',content:{tag:'visible',body:'hello'}}],runs:[]};
const e=n=>({type:'event',streamId:'room',seq:String(n),change:{type:'message',message:{id:'m',createdSeq:'1',revision:String(n),content:{tag:'visible',body:'edit'}}}});
const base=synchronize(initialState(),s).state;`;
const cases = [
	['revision', 'compare(message.revision, previous.revision) <= 0', 'false', `const old=e(2);old.change.message.revision='0';assert.equal(synchronize(base,old).state.rooms[0].messages[0].content.body,'hello','guard revision');`],
	['duplicate', 'compare(input.seq, room.cursor) <= 0', 'false', `const applied=synchronize(base,e(2)).state;assert.equal(synchronize(applied,e(2)).state,applied,'guard duplicate');`],
	['gap-ack', 'compare(next.cursor, room.cursor) > 0', 'true', `assert.deepEqual(synchronize(base,e(3)).acknowledgements,[],'guard gap-ack');`],
	['unknown', "putRoom(state, { ...room, mode: 'upgrade' })", "putRoom(state, { ...room, mode: 'live' })", `const paused=synchronize(base,{type:'unsupported',streamId:'room'}).state;assert.equal(synchronize(paused,e(2)).state.rooms[0].cursor,'1','guard unknown');`],
	['snapshot-order', 'compare(input.cursor, room.cursor) < 0', 'false', `const applied=synchronize(base,e(2)).state;assert.equal(synchronize(applied,s).state.rooms[0].cursor,'2','guard snapshot-order');`],
	['buffer-bound', 'room.pending.length >= 1000', 'false', `let state=base;for(let i=3;i<1004;i++)state=synchronize(state,e(i)).state;assert.equal(state.rooms[0].mode,'resync','guard buffer-bound');`],
	['command-digest', 'previous.requestDigest !== input.requestDigest', 'false', `const submit={type:'submit',commandId:'c',streamId:'room',requestDigest:'first',online:true};const pending=synchronize(base,submit).state;assert.deepEqual(synchronize(pending,{...submit,requestDigest:'changed'}).requests,[{type:'conflict',commandId:'c'}],'guard command-digest');`],
	['input-ownership', 'const input = copy(value);', 'const input = value;', `assert.doesNotThrow(()=>{s.messages[0].content.body='caller edit'},'guard input-ownership');assert.equal(base.rooms[0].messages[0].content.body,'hello','guard input-ownership');`],
] as const;

test.each(cases)('%s guard is necessary: disabling it in an isolated copy turns its public assertion red', (name, before, after, probe) => {
	expect(source.split(before).length, `${name} mutation is unique`).toBe(2);
	const dir = mkdtempSync(path.join(tmpdir(), 'agora-core-guard-'));
	try {
		const file = path.join(dir, 'core.mts');
		const script = `import assert from 'node:assert/strict';import {initialState,synchronize} from ${JSON.stringify(pathToFileURL(file).href)};${setup}${probe}`;
		writeFileSync(file, source);
		const guarded = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
		expect(guarded.status, guarded.stderr).toBe(0);
		writeFileSync(file, source.replace(before, after));
		const weakened = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
		expect(weakened.status).toBe(1);
		expect(weakened.stderr).toContain(`guard ${name}`);
	} finally { rmSync(dir, { recursive: true, force: true }); }
});
