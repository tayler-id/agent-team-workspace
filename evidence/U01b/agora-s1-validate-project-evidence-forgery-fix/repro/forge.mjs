// Reproduces agora-handoff-security-review F1/F2/F3 against the real validator. Writes a bundle no recorder produced.
import { createHash, createHmac } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const [dir, head, base, keyFile, redExit = '1'] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const h = (b) => `sha256:${createHash('sha256').update(b).digest('hex')}`;
const cfg = { command: 'true', vitest_config: 'sha256:fake', tsconfig_base: 'sha256:fake', lockfile: 'sha256:fake' };
const log = (exit) => `head: ${head}\nparent: ${base}\nconfiguration: ${JSON.stringify(cfg)}\nobserved_exit: ${exit}\n`;
writeFileSync(`${dir}/red.log`, log(redExit)); writeFileSync(`${dir}/green.log`, log(0)); writeFileSync(`${dir}/test-patch.diff`, '');
const art = (f) => { const b = readFileSync(`${dir}/${f}`); return { file: f, digest: h(b), byte_length: b.length }; };
const fields = { trust_class: 'owner_attested', boot_id: 'forged', head, base, outcome: 'pass' };
const sig = createHmac('sha256', readFileSync(keyFile)).update(JSON.stringify(fields, Object.keys(fields).sort())).digest('hex');
writeFileSync(`${dir}/manifest.json`, JSON.stringify({ schema_version: 'agora.evidence-manifest/v1', target: 'local-foundation-fixture', outcome: 'pass',
  artifacts: ['red.log','green.log','test-patch.diff'].map(art), producer: { ...fields, key_file: keyFile, signature: sig } }, null, 2));
