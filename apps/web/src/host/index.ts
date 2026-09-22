export { createBrowserEnvironment, getMountRoot } from './environment.ts';
export { createFixtureTransport, largeSnapshot, load, toEvent, toReceipt, toSnapshot, type Failure, type FixtureTransport, type Loaded, type RoomFixture } from './fixture.ts';
export { observeFonts, observeWidth, prefersReducedMotion, readGeometry } from './geometry.ts';
export { fallbackSizer, geometryKey, type SizerFactory, type TextGeometry, type TextSizer } from './text-sizing.ts';
export { pretextSizer, pretextSupported } from './pretext.ts';
import { pretextSizer, pretextSupported } from './pretext.ts';
import { fallbackSizer, type TextGeometry, type TextSizer } from './text-sizing.ts';

// Pretext where Canvas 2D and Intl.Segmenter exist; the deterministic fallback elsewhere, or when forced.
export function createTextSizer(geometry: TextGeometry, engine: 'auto' | 'fallback' = 'auto'): TextSizer {
	return engine === 'auto' && pretextSupported() ? pretextSizer(geometry) : fallbackSizer(geometry);
}
