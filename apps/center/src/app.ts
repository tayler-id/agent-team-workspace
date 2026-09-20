import { randomUUID } from 'node:crypto';
import { createWireValidator, type Schema } from '@agora/contracts';
import { asScopeId, decideFixtureScopeAccess, FIXTURE_POLICY, FIXTURE_POLICY_DIGEST } from '@agora/domain';
import { Hono } from 'hono';

// Wire types come only from the generated contract consumer; the center authors no wire shape of its own.
export type HealthReport = Schema<'HealthReport'>;
export type ReadinessReport = Schema<'ReadinessReport'>;
export type FixturePolicyDecisionReport = Schema<'FixturePolicyDecisionReport'>;
export type ErrorReport = Schema<'ErrorReport'>;

export interface CenterDependencies {
	probeDatabase(): Promise<boolean>;
}

const wire = createWireValidator();

export function createApp(deps: CenterDependencies): Hono {
	const app = new Hono();
	app.notFound((c) => c.json<ErrorReport>({ reason_code: 'not_found', correlation_id: randomUUID() }, 404));
	app.get('/api/v1/health', (c) => c.json<HealthReport>({ schema_version: 'agora.health/v1', status: 'ok', service: 'agora-center' }));
	app.get('/api/v1/health/ready', async (c) => {
		const database = (await deps.probeDatabase()) ? 'ok' : 'unavailable';
		const report: ReadinessReport = { schema_version: 'agora.readiness/v1', status: database === 'ok' ? 'ready' : 'not_ready', checks: { database } };
		return c.json(report, report.status === 'ready' ? 200 : 503);
	});
	app.post('/api/v1/fixture/policy/decisions', async (c) => {
		const body: unknown = await c.req.json().catch(() => undefined);
		const command = wire.validate('FixturePolicyCommand', body);
		if (!command.ok) return c.json<ErrorReport>({ reason_code: 'malformed_command', correlation_id: randomUUID(), details: command.details }, 400);
		const decision = decideFixtureScopeAccess({ scopeId: asScopeId(command.value.actor.scope_id) }, { scopeId: asScopeId(command.value.subject.scope_id) });
		return c.json<FixturePolicyDecisionReport>({ schema_version: 'agora.fixture-policy-decision/v1', ...decision, policy_version: FIXTURE_POLICY.version, policy_digest: FIXTURE_POLICY_DIGEST });
	});
	return app;
}
