import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/expo.ts'),
      name: 'AnalyticsTrackerExpo',
      formats: ['umd', 'es'],
      fileName: (format) => `expo.${format}.js`,
    },
    minify: true,
    sourcemap: true,
    // Don't clean the dist folder - the web build already placed files there
    emptyOutDir: false,
    rollupOptions: {
      // All React Native and Expo packages are external (provided by the consuming app)
      external: [
        'react',
        'react-native',
        '@react-navigation/native',
        '@react-native-async-storage/async-storage',
        'expo-device',
        'expo-localization',
        'expo-location',
        'expo-application',
      ],
    },
  },
});
