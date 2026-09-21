import { expect, test } from 'vitest';
import { compileAnswerContext } from '@agora/domain/local-answer';
import { asCommandId, LOCAL_ROOM } from '@agora/domain';

test('the public pure-core harness loads and explicitly denies unsupported input', () => {
	expect(compileAnswerContext({ scope: LOCAL_ROOM, requestId: asCommandId('a0000000-0000-4000-8000-000000000010'), selectedIds: [] }, { kind: 'unsupported' }).outcome).toBe('denied');
});
