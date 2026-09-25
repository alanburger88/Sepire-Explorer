import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build also works when hosted under a sub-path.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Name the heavy, lazily loaded libraries so they cache independently.
        manualChunks(id) {
          if (/node_modules\/(@codemirror|@lezer|cm6-graphql|graphql-language-service|codemirror)/.test(id)) return 'editor';
          if (/node_modules\/graphql\//.test(id)) return 'graphql';
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
  server: { port: 5190 },
  preview: { port: 4173 },
});
