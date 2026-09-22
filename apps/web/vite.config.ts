import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Production builds carry a strict policy: only same-origin scripts and styles, no objects, no base override.
// The dev server keeps none because @vitejs/plugin-react injects an inline refresh preamble there.
export const contentSecurityPolicy = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'";

export default defineConfig({
	plugins: [react(), { name: 'agora-csp', apply: 'build', transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy }, injectTo: 'head-prepend' }] }],
	build: { target: 'es2024', sourcemap: false },
});
