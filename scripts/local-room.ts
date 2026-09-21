// Test-only public runtime baseline: doctor runs; lifecycle and replay are not composed yet.
const command = process.argv[2];
process.stdout.write(`${JSON.stringify({ schema_version: 'agora.local-runtime/v1', command, outcome: command === 'doctor' ? 'pass' : 'unavailable', detail: command === 'doctor' ? process.version : 'local runtime is not composed' })}\n`);
process.exitCode = command === 'doctor' ? 0 : 3;
