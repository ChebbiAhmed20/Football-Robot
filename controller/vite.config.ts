import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import { fileURLToPath } from 'url';

export default defineConfig({
  root: '.',
  build: {
    outDir: fileURLToPath(new URL('../firmware/data', import.meta.url)),
    emptyOutDir: true,
    target: 'es2022',
    minify: 'esbuild'
  },
  plugins: [
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      deleteOriginFile: false
    })
  ],
  server: {
    port: 5173
  }
});
