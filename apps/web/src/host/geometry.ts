// Browser geometry observation: computed text style, container width, font readiness and motion preference.
import type { TextGeometry } from './text-sizing.ts';

const px = (value: string, fallback: number): number => { const n = Number.parseFloat(value); return Number.isFinite(n) ? n : fallback; };

// Reads the geometry the browser actually renders paragraphs with, from a mounted paragraph-styled probe and the
// measured row width. Pretext's README requires a named family; system-ui aliases mismeasure on macOS.
export function readGeometry(probe: Element, width: number, fontsVersion: number): TextGeometry {
	const style = getComputedStyle(probe);
	const fontSize = px(style.fontSize, 15);
	const family = style.fontFamily || 'Helvetica Neue, Helvetica, Arial, sans-serif';
	return {
		font: `${style.fontStyle || 'normal'} ${style.fontWeight || '400'} ${fontSize}px ${family}`,
		fontSize,
		lineHeight: px(style.lineHeight, fontSize * 1.5),
		width,
		letterSpacing: px(style.letterSpacing, 0),
		whiteSpace: style.whiteSpace === 'pre-wrap' || style.whiteSpace === 'pre-line' ? 'pre-wrap' : 'normal',
		lang: probe.closest('[lang]')?.getAttribute('lang') ?? '',
		fontsVersion,
	};
}

// Width changes arrive through ResizeObserver where it exists and window resize elsewhere (jsdom).
export function observeWidth(element: Element, listener: () => void): () => void {
	if (typeof ResizeObserver === 'function') {
		const observer = new ResizeObserver(listener);
		observer.observe(element);
		return () => { observer.disconnect(); };
	}
	window.addEventListener('resize', listener);
	return () => { window.removeEventListener('resize', listener); };
}

// Font readiness bumps a version: once when document.fonts.ready settles and again on every later loadingdone.
export function observeFonts(listener: () => void): () => void {
	// jsdom has no document.fonts; the DOM lib types it as always present.
	const fonts = (document as { fonts?: FontFaceSet }).fonts;
	if (!fonts) return () => undefined;
	let live = true;
	void fonts.ready.then(() => { if (live) listener(); });
	fonts.addEventListener('loadingdone', listener);
	return () => { live = false; fonts.removeEventListener('loadingdone', listener); };
}

export const prefersReducedMotion = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
