// jsdom geometry doubles: the timeline region is a sized scroll container, rows are as tall as their text is
// long, widths shrink on resize so heights change, and Element.scrollTo records every programmatic scroll.
export const geometry = { viewport: 600, width: 800, reducedMotion: false };
export const scrollCalls: ScrollToOptions[] = [];
export const fonts = Object.assign(new EventTarget(), { ready: Promise.resolve() });
const rowHeight = (element: HTMLElement): number => 48 + 22 * Math.max(1, Math.ceil(element.textContent.length / (geometry.width / 8)));

export function installGeometry(): void {
	Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get(this: HTMLElement) { return this.classList.contains('timeline') ? geometry.viewport : this.classList.contains('row') ? rowHeight(this) : 0; } });
	Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get(this: HTMLElement) { return this.classList.contains('timeline') ? geometry.viewport : 0; } });
	Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get(this: HTMLElement) { return this.classList.contains('timeline') ? geometry.width : 0; } });
	Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get(this: HTMLElement) { return this.classList.contains('timeline') ? Number.parseFloat(this.querySelector<HTMLElement>('.rows')?.style.height ?? '0') || 0 : 0; } });
	Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get(this: HTMLElement) { return this.classList.contains('timeline') ? geometry.width : 0; } });
	Element.prototype.scrollTo = function (this: Element, options?: ScrollToOptions | number) { const opts = typeof options === 'number' ? { top: options } : options ?? {}; scrollCalls.push(opts); this.scrollTop = opts.top ?? 0; this.dispatchEvent(new Event('scroll')); };
	Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
	Object.defineProperty(globalThis, 'OffscreenCanvas', { configurable: true, value: class { getContext(): null { return null; } } });
	scrollCalls.length = 0;
	geometry.viewport = 600; geometry.width = 800; geometry.reducedMotion = false;
	window.location.hash = '';
}
