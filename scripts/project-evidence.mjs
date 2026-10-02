// U01b.B02 evidence manifest format, shared by record-red-green.mjs (signer) and validate-evidence.mjs (verifier)
// so both sign exactly the same bytes. The key is never named by the manifest: the signer and the verifier each
// take it from the checkout (or the verifier's --key), so a bundle author cannot pick the key that checks it.
import { createHmac } from 'node:crypto';

export const manifestSchema = 'agora.evidence-manifest/v2';
export const defaultKeyFile = '.scratch/producer.key';

const canonical = (value) => Array.isArray(value)
	? `[${value.map(canonical).join(',')}]`
	: value !== null && typeof value === 'object'
		? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
		: JSON.stringify(value);

// Covers every manifest field except the signature itself: schema, target, outcome, each artifact's digest and
// length, and the producer block. Changing any of them, or an artifact's bytes, needs the key to re-sign.
export function sign(key, manifest) {
	const producer = { ...manifest.producer };
	delete producer.signature;
	return createHmac('sha256', key).update(canonical({ ...manifest, producer })).digest('hex');
}

// The process exit code the recorder wrote, or undefined. A signal kill, a timeout or any non-integer is not an exit.
export function observedExit(log) {
	const match = log.match(/^observed_exit: (\d{1,3})$/m);
	return match ? Number(match[1]) : undefined;
}
