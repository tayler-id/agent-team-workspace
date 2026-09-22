// The only module allowed to import @chenglou/pretext (scripts/boundary-policy.ts enforces it). Pretext
// prepares text once per geometry and lays it out arithmetically; it is a sizing input, never a row owner.
import { layout, prepare } from '@chenglou/pretext';
import { cachedSizer, type TextGeometry, type TextSizer } from './text-sizing.ts';

function canvasContext(): boolean {
	try {
		if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(1, 1).getContext('2d') !== null;
		return typeof document !== 'undefined' && document.createElement('canvas').getContext('2d') !== null;
	} catch { return false; }
}
export const pretextSupported = (): boolean => typeof Intl.Segmenter === 'function' && canvasContext();

export function pretextSizer(geometry: TextGeometry): TextSizer {
	return cachedSizer('pretext', geometry, (text) => layout(prepare(text, geometry.font, { whiteSpace: geometry.whiteSpace, letterSpacing: geometry.letterSpacing }), geometry.width, geometry.lineHeight).height);
}
