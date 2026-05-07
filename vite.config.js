import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3005,
    strictPort: false,
    open: true
  },
  build: { outDir: 'dist' }
});
