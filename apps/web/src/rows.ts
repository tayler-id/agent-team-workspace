// Pure row sizing routes: text-only rows are estimated from paragraph text through the sizer; every row with a
// code block, tombstone or citation control is measured in the DOM and never handed to the text engine.
import { segments, type Row } from '@agora/web-framework';
import type { TextSizer } from './host/index.ts';

export type RowSizing = { readonly kind: 'text'; readonly paragraphs: readonly string[] } | { readonly kind: 'measured'; readonly reason: 'code' | 'tombstone' | 'citations' };
// Fixed per-row pixels around paragraph text (meta line, padding, hairline), calibrated from measured text rows.
export interface RowChrome { readonly base: number; readonly paragraphGap: number; readonly measured: number }
export const defaultChrome: RowChrome = { base: 46, paragraphGap: 8, measured: 120 };

export function classify(row: Row): RowSizing {
	if (row.message.content.tag === 'tombstone') return { kind: 'measured', reason: 'tombstone' };
	if (row.citations.length > 0) return { kind: 'measured', reason: 'citations' };
	const parts = segments(row.message.content.body);
	if (parts.some((part) => part.kind === 'code')) return { kind: 'measured', reason: 'code' };
	return { kind: 'text', paragraphs: parts.map((part) => part.value) };
}

export const textHeight = (paragraphs: readonly string[], sizer: TextSizer, chrome: RowChrome): number => paragraphs.reduce((sum, text) => sum + sizer.height(text), 0) + Math.max(0, paragraphs.length - 1) * chrome.paragraphGap;

export function estimateRow(row: Row, sizer: TextSizer, chrome: RowChrome): number {
	const sizing = classify(row);
	return sizing.kind === 'text' ? chrome.base + textHeight(sizing.paragraphs, sizer, chrome) : chrome.measured;
}

// A measured text row reveals the real chrome: measured height minus what the sizer said the text needs.
export function calibrate(row: Row, measured: number, sizer: TextSizer, chrome: RowChrome): RowChrome {
	const sizing = classify(row);
	if (sizing.kind !== 'text') return chrome;
	return { ...chrome, base: Math.max(0, Math.round(measured - textHeight(sizing.paragraphs, sizer, chrome))) };
}
