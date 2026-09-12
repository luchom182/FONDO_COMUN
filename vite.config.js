import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // This app uses plain CSS; do not inherit PostCSS configuration from a parent repo.
  css: { postcss: { plugins: [] } },
  server: {
    port: 5173,
    open: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: []
  }
});
