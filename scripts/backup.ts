// Test-only R22 baseline for U01c.B01 red evidence: the public entry point and its usage contract, with no backup behavior.
process.stdout.write(`${JSON.stringify({ outcome: 'usage_error', message: 'usage: backup keygen|create|restore (see docs/site/cli.md)' })}\n`);
process.exitCode = 64;
