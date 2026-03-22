import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AnalyticsTracker',
      formats: ['umd', 'es'],
      fileName: (format) => `tracker.${format}.js`,
    },
    minify: true,
    sourcemap: true,
  },
});