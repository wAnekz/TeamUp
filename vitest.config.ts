import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Separate from vite.config.ts so unit tests don't spin up the PWA plugin.
// Rules tests (tests/rules) need the Firestore emulator and run via
// `npm run test:rules` instead — see package.json.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
