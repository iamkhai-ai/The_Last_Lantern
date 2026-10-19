import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  server: {
    port: 5173,
    open: true,
    watch: {
      // Editors/agents that save atomically create transient `.<name>.<pid>.<uuid>.tmpdir` folders.
      // On Windows, watching them races their deletion and crashes the dev server with EBUSY.
      ignored: ['**/.*.tmpdir/**', '**/*.tmp'],
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 6000,
  },
});
