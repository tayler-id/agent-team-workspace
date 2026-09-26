// Display reading of a stored wire Timestamp. Callers keep the original created_at; this never invents an instant or a sort key.

const wirePattern = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d|60)(?:\.\d{1,9})?Z$/;

export interface TimeContext { readonly locale: string; readonly timeZone: string; readonly now: number }
export interface MessageTimeDisplay {
	readonly state: 'missing' | 'invalid' | 'valid';
	readonly visible: string;
	readonly spoken: string;
	readonly inspected: string;
	readonly dateTime: string | undefined;
}

const missing: MessageTimeDisplay = { state: 'missing', visible: '', spoken: 'no time', inspected: 'no time', dateTime: undefined };
const invalid: MessageTimeDisplay = { state: 'invalid', visible: 'Unreadable time', spoken: 'Unreadable time', inspected: 'Unreadable time', dateTime: undefined };

const dayKey = (ms: number, timeZone: string): string => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
const yearKey = (ms: number, timeZone: string): string => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric' }).format(ms);

/** Accept only a Zulu wire Timestamp whose calendar fields survive parsing. Overflow dates and leap seconds are rejected, not rolled. */
export function wireInstant(raw: string): number | undefined {
	const match = wirePattern.exec(raw);
	if (!match) return undefined;
	const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]), hour = Number(match[4]), minute = Number(match[5]), second = Number(match[6]);
	if (second === 60) return undefined;
	const ms = Date.parse(raw);
	if (!Number.isFinite(ms)) return undefined;
	const instant = new Date(ms);
	if (instant.getUTCFullYear() !== year || instant.getUTCMonth() + 1 !== month || instant.getUTCDate() !== day || instant.getUTCHours() !== hour || instant.getUTCMinutes() !== minute || instant.getUTCSeconds() !== second) return undefined;
	return ms;
}

export function formatMessageTime(raw: string, context: TimeContext): MessageTimeDisplay {
	if (raw === '') return missing;
	const ms = wireInstant(raw);
	if (ms === undefined) return invalid;
	const { locale, timeZone, now } = context;
	const sameDay = dayKey(ms, timeZone) === dayKey(now, timeZone);
	const sameYear = yearKey(ms, timeZone) === yearKey(now, timeZone);
	const clock: Intl.DateTimeFormatOptions = { timeZone, hour: 'numeric', minute: '2-digit' };
	const visible = new Intl.DateTimeFormat(locale, sameDay ? clock : { ...clock, month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) }).format(ms);
	const spoken = new Intl.DateTimeFormat(locale, { timeZone, year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'long' }).format(ms);
	return { state: 'valid', visible, spoken, inspected: `${spoken} (${raw})`, dateTime: raw };
}

/** Viewer locale and timezone from the runtime. The stored wire value is not rewritten. */
export function displayMessageTime(raw: string, now: number = Date.now()): MessageTimeDisplay {
	const resolved = new Intl.DateTimeFormat().resolvedOptions();
	return formatMessageTime(raw, { locale: resolved.locale || 'en-US', timeZone: resolved.timeZone, now });
}
