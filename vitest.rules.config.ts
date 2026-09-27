import { defineConfig } from 'vitest/config';

// Security-rules tests. Needs the Firestore + Storage emulators, so run
// through `npm run test:rules` (firebase emulators:exec), never plain vitest.
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
