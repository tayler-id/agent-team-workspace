// Harness revision: contract sources are not published yet, so every mode reports unavailable (exit 3).
// Usage: node contracts/tools/generate.mjs [--check] [--subset-only]
const argv = process.argv.slice(2);
const mode = argv.includes('--subset-only') ? 'subset-only' : argv.includes('--check') ? 'check' : 'generate';
console.log(JSON.stringify({ schema_version: 'agora.contract-generation-run/v1', mode, outcome: 'unavailable', exit: 3, message: 'no contract sources published' }));
process.exit(3);
