import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3005,
    strictPort: false,
    open: true,
    proxy: {
      '/uploads': 'http://localhost:3001',
      '/api': 'http://localhost:3001'
    }
  },
  build: { outDir: 'dist' }
});
