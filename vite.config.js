import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    strictPort: true,  // fail if 3000 is taken, don't silently use 3003
    open: true
  },
  build: { outDir: 'dist' }
});
