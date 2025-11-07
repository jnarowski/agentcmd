import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/**.test.ts'],
    // E2E tests run sequentially to avoid conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Longer timeouts for E2E tests
    testTimeout: 180000, // 3 minutes per test
    hookTimeout: 30000, // 30 seconds for setup/teardown
  },
});
