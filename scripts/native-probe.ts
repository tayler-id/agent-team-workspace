import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const nativeRemedy = 'Use a compatible unwrapped Node runtime, then pnpm install --frozen-lockfile with optional dependencies. Keep the lockfile. macOS Team-ID errors require a runtime that permits native addons, not another package.';
export const supportedRuntimeRemedy = 'Put an official nodejs.org Node 24.21.0 (the .node-version pin) first on PATH, then repeat doctor; see docs/runbooks/development.md.';
const source = `
try {
 if (process.versions.webcontainer) throw new Error('WebContainer native probe unavailable; no automatic fallback installation');
 await import('vitest/node');
 const native = process.report.getReport().sharedObjects.filter(p => /rolldown-binding.*\\.node$/.test(p));
 if (!native.length) throw new Error('Rolldown native library not loaded (WASM is not native readiness)');
 console.log(native.join('\\n'));
} catch (error) {
 const messages = []; for (let e = error; e; e = e.cause) messages.unshift(e.message);
 console.error(messages.join('\\n')); process.exit(2);
}`;
export const command = (file: string, argv: string[]): string => {
	const result = spawnSync(file, argv, { cwd: root, encoding: 'utf8', timeout: 15_000, maxBuffer: 64 * 1024,
		env: { ...process.env, COREPACK_ENABLE_NETWORK: '0', npm_config_manage_package_manager_versions: 'false' } });
	if (result.status !== 0) throw new Error(String(result.error ?? (result.stderr.slice(0, 6000) || `exit ${result.status}`)));
	return result.stdout.trim();
};
export const nativeProbe = (file: string = process.execPath): string => command(file, ['--input-type=module', '-e', source]);
// One operator-readable line from a failed probe; never the raw multi-path loader output.
export const nativeCause = (error: unknown): string => {
	const text = String(error);
	if (text.includes('different Team IDs')) return 'macOS rejected the Rolldown native addon: its code signature has a different Team ID than this Node (signed host launcher)';
	const line = text.split('\n').find((l) => l.trim() && !/^\s*(at |Require stack|- )/.test(l)) ?? 'unknown native load failure';
	return line.replaceAll(root, '<repo>/').replace(/^(Error: )+/, '').slice(0, 300);
};
