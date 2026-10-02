// F2: replace an artifact and update only its unsigned digest; the signature field is left byte-identical.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const [dir, name, text] = process.argv.slice(2);
writeFileSync(`${dir}/${name}`, text);
const m = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8')); const before = m.producer.signature;
const b = readFileSync(`${dir}/${name}`);
m.artifacts = m.artifacts.map((a) => a.file === name ? { file: name, digest: `sha256:${createHash('sha256').update(b).digest('hex')}`, byte_length: b.length } : a);
writeFileSync(`${dir}/manifest.json`, JSON.stringify(m, null, 2));
console.log(`producer.signature unchanged: ${m.producer.signature === before}`);
