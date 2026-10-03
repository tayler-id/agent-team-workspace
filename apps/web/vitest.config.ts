import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// jsdom timeline tests take up to ~4 s on a developer machine and longer on hosted CI runners; vitest's 5 s default
// timed out the reconnect test in agora-ci and left its render running into the next tests. This bounds a hang, not speed.
export default defineConfig({ plugins: [react()], test: { name: 'web', environment: 'jsdom', include: ['test/**/*.test.tsx', 'test/**/*.test.ts'], testTimeout: 30_000 } });
