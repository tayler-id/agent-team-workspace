const args = process.argv.slice(2).filter(arg => arg !== '--');
if (args.includes('--help')) {
	console.log('Usage: node scripts/ci-doctor.mjs [--json]; read-only Node/pnpm/Rolldown prerequisites, not behavioral tests.');
	process.exit(0);
}
if (args.some(arg => arg !== '--json')) process.exit(64);
console.log(JSON.stringify({ schema_version: 'agora.ci-doctor/v1', outcome: 'blocked', results: [], remedy: 'Test-only harness: probes not implemented.' }));
process.exit(2);
