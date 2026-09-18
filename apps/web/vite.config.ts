import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@web': fileURLToPath(new URL('./src', import.meta.url)),
      '@repos/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url)
      ),
    },
  },
  server: {
    host: '127.0.0.1',
    port: Number(process.env.REPOS_WEB_PORT ?? 5173),
    strictPort: true,
  },
  preview: { host: '127.0.0.1', port: Number(process.env.REPOS_WEB_PORT ?? 5173) },
});
