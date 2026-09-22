// Application-owned browser Host adapter. The only module allowed to touch window/document/crypto for shell capabilities.
import type { EnvironmentPort, RoomTransport } from '@agora/web-framework';

/** The composition root's only DOM access: find the element it mounts the app into. */
export function getMountRoot(domId: string): HTMLElement | null {
	return document.getElementById(domId);
}

export function createBrowserEnvironment(transport: RoomTransport, options: { readonly digestText?: (text: string) => Promise<string> } = {}): EnvironmentPort {
	let focusTimer: ReturnType<typeof setTimeout> | undefined;
	const digestText = options.digestText ?? (async (text: string): Promise<string> => {
		const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
		return `sha256:${[...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
	});
	return {
		transport,
		scheduleFocus: (domId, options) => {
			const focus = (): void => { document.getElementById(domId)?.focus(); };
			if (!options?.defer) { focus(); return; }
			if (focusTimer !== undefined) clearTimeout(focusTimer);
			focusTimer = setTimeout(() => { focus(); focusTimer = undefined; }, 0);
		},
		subscribeMediaQuery: (query, onChange) => {
			if (typeof window.matchMedia !== 'function') return () => undefined;
			const list = window.matchMedia(query);
			const listener = (): void => { onChange(list.matches); };
			list.addEventListener('change', listener);
			return () => { list.removeEventListener('change', listener); };
		},
		matchesMediaQuery: (query) => typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false,
		now: () => Date.now(),
		createId: () => crypto.randomUUID(),
		digestText,
		defer: (fn, ms) => {
			const timer = setTimeout(fn, ms);
			return () => { clearTimeout(timer); };
		},
	};
}
