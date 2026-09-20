import { randomUUID } from 'node:crypto';
import fixturePolicyCommandSchema from '@agora/contracts/schemas/fixture-policy-command.schema.json' with { type: 'json' };
import { asScopeId, decideFixtureScopeAccess, FIXTURE_POLICY, FIXTURE_POLICY_DIGEST, type Digest } from '@agora/domain';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { Hono } from 'hono';

export interface HealthReport {
	schema_version: 'agora.health/v1';
	status: 'ok';
	service: 'agora-center';
}

export interface ReadinessReport {
	schema_version: 'agora.readiness/v1';
	status: 'ready' | 'not_ready';
	checks: { database: 'ok' | 'unavailable' };
}

export interface FixturePolicyDecisionReport {
	schema_version: 'agora.fixture-policy-decision/v1';
	decision: 'allow' | 'deny';
	reason_code?: 'scope_mismatch';
	policy_version: typeof FIXTURE_POLICY.version;
	policy_digest: Digest;
}

export interface ErrorReport {
	reason_code: 'malformed_command' | 'not_found';
	correlation_id: string;
	details?: string[];
}

export interface CenterDependencies {
	probeDatabase(): Promise<boolean>;
}

interface FixturePolicyCommand {
	schema_version: 'agora.fixture-policy-command/v1';
	actor: { scope_id: string };
	subject: { scope_id: string };
}

// R07/R21: 2020-12 mode, no coercion, no defaults, no property removal, formats asserted, no network resolution.
const ajv = addFormats.default(new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false, validateFormats: true, loadSchema: () => Promise.reject(new Error('remote schema resolution is disabled')) }));
const validateFixturePolicyCommand = ajv.compile<FixturePolicyCommand>(fixturePolicyCommandSchema);

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
		if (!validateFixturePolicyCommand(body)) {
			const details = (validateFixturePolicyCommand.errors ?? []).map((e) => `${e.instancePath || '$'} ${e.message ?? 'invalid'}`);
			return c.json<ErrorReport>({ reason_code: 'malformed_command', correlation_id: randomUUID(), details }, 400);
		}
		const decision = decideFixtureScopeAccess({ scopeId: asScopeId(body.actor.scope_id) }, { scopeId: asScopeId(body.subject.scope_id) });
		return c.json<FixturePolicyDecisionReport>({ schema_version: 'agora.fixture-policy-decision/v1', ...decision, policy_version: FIXTURE_POLICY.version, policy_digest: FIXTURE_POLICY_DIGEST });
	});
	return app;
}
