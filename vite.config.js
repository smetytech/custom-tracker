// vite.config.js
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // This is the key setting for building a library
    lib: {
      // The entry point for your library
      entry: resolve(__dirname, 'src/tracker.js'),
      // The global variable name when used in a <script> tag
      name: 'AnalyticsTracker',
      // The formats to output. 'umd' is for CDN, 'es' is for modern imports
      formats: ['umd', 'es'],
      // The name of the output file
      fileName: (format) => `tracker.${format}.js`,
    },
    // Optional: for older browser support
    // target: 'es2015', 
    minify: true,
  },
});