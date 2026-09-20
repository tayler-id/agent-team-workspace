// Internal observations only. The public driver derives these facts by replay, never from claims.
export const required = ['red', 'green', 'guard', 'bootstrap', 'contracts', 'client', 'documentation', 'static'];
export const deferred = ['FG04', 'FG05', 'FG06', 'FG07', 'FG08'];
export function assess(value) {
	const denials = [];
	const records = value.records ?? [];
	if (value.applicability !== 'behavior') denials.push('applicability_invalid');
	if (!/^[a-f0-9]{40}$/.test(value.parent) || !/^[a-f0-9]{40}$/.test(value.head) || value.parent === value.head) denials.push('revision_invalid');
	if (!value.mapped) denials.push('feature_map_drift');
	if (!value.prerequisites) denials.push('prerequisite_unmet');
	if (new Set(records.map(record => record.subject)).size !== records.length) denials.push('subject_duplicate');
	if (new Set(records.map(record => record.id)).size !== records.length) denials.push('proof_duplicate');
	for (const record of records) {
		if (!required.includes(record.id)) denials.push('proof_unknown');
		if (record.revision !== (record.id === 'red' ? value.parent : value.head)) denials.push(`${record.id}_revision`);
		if (record.verified !== true) denials.push(`${record.id}_unverified`);
	}
	for (const id of required) if (!records.some(record => record.id === id)) denials.push(`${id}_missing`);
	if (value.scope !== 'task') denials.push(...deferred.map(id => `${id}_missing`), 'U01a_integration_unqualified');
	if (value.scope === 'feature') denials.push('feature_premature');
	if (!['task', 'foundation', 'feature'].includes(value.scope)) denials.push('scope_invalid');
	return [...new Set(denials)].sort();
}
