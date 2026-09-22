// The one renderer-owned text-sizing interface. A sizing engine (Pretext, or the deterministic fallback below)
// sits behind TextSizer; contracts, client-core, services and native clients never see fonts, widths or line heights.
export interface TextGeometry {
	readonly font: string; // canvas font shorthand, e.g. "normal 400 15px Helvetica Neue, Helvetica, Arial, sans-serif"
	readonly fontSize: number;
	readonly lineHeight: number;
	readonly width: number;
	readonly letterSpacing: number;
	readonly whiteSpace: 'normal' | 'pre-wrap';
	readonly lang: string;
	readonly fontsVersion: number;
}
export interface TextSizer { readonly kind: 'pretext' | 'fallback'; readonly key: string; readonly height: (text: string) => number }
export type SizerFactory = (geometry: TextGeometry) => TextSizer;
const cacheLimit = 4096;

// Every input that changes rendered geometry is in the key, so a sizer built for one font, width, spacing,
// language or font-loading state can never answer for another.
export const geometryKey = (g: TextGeometry): string => [g.font, g.fontSize, g.lineHeight, g.width, g.letterSpacing, g.whiteSpace, g.lang, g.fontsVersion].join('|');

export function cachedSizer(kind: TextSizer['kind'], geometry: TextGeometry, measure: (text: string) => number): TextSizer {
	const cache = new Map<string, number>();
	return {
		kind, key: geometryKey(geometry),
		height(text) {
			const hit = cache.get(text);
			if (hit !== undefined) return hit;
			const height = measure(text);
			if (cache.size >= cacheLimit) cache.clear();
			cache.set(text, height);
			return height;
		},
	};
}

// Deterministic estimate for runtimes without Canvas 2D text measurement: an average advance of half the font
// size per character. Newlines always break; the browser later corrects mounted rows by measurement.
export function fallbackSizer(geometry: TextGeometry): TextSizer {
	const perLine = Math.max(1, Math.floor(geometry.width / (geometry.fontSize * 0.5 + geometry.letterSpacing)));
	return cachedSizer('fallback', geometry, (text) => text.split('\n').reduce((lines, part) => lines + Math.max(1, Math.ceil(part.length / perLine)), 0) * geometry.lineHeight);
}
