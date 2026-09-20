import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSite } from '../validate.mjs';

test('documentation guard driver starts and accepts its empty baseline', () => {
	assert.deepEqual(validateSite({ pages: [], atlas: { milestones: [] } }), []);
});
