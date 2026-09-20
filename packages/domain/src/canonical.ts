import { createHash } from 'node:crypto';

export type Digest = `sha256:${string}`;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// RFC 8785 subset: sorted member names, no insignificant whitespace, ES number serialization. Non-finite numbers and undefined are not JSON and are rejected.
export function canonicalJson(value: unknown): string {
	return serialize(value, '$');
}

function serialize(value: unknown, at: string): string {
	if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) throw new TypeError(`canonicalJson: non-finite number at ${at}`);
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) return `[${value.map((item, index) => serialize(item, `${at}[${index}]`)).join(',')}]`;
	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.filter(([, member]) => member !== undefined)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
		return `{${entries.map(([key, member]) => `${JSON.stringify(key)}:${serialize(member, `${at}.${key}`)}`).join(',')}}`;
	}
	throw new TypeError(`canonicalJson: unsupported ${typeof value} at ${at}`);
}

export function digestCanonical(value: JsonValue): Digest {
	return `sha256:${createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')}`;
}
