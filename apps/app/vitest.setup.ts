// CRITICAL: Set DATABASE_URL BEFORE any imports
// Each worker gets isolated database using VITEST_POOL_ID (stable worker ID)
const workerId = process.env.VITEST_POOL_ID || '1';
process.env.DATABASE_URL = `file:./test-worker-${workerId}.db`;

import { expect, beforeAll } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Set required environment variables for tests
// IMPORTANT: JWT_SECRET must be set before any imports that use Configuration
process.env.JWT_SECRET = 'test-jwt-secret-for-vitest';

// Reset Configuration after imports to ensure it reads test JWT_SECRET
beforeAll(async () => {
  // Config is now loaded from @/server/config which validates on import
  // No need to reset anymore since env vars are set before any imports
});

expect.extend(matchers);

// Suppress happy-dom AbortError messages during teardown
// These are harmless cleanup errors that occur when Vitest tears down the test environment
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = args.join(' ');

  // Filter out happy-dom AbortError stack traces
  if (message.includes('DOMException [AbortError]') ||
      message.includes('Fetch.onAsyncTaskManagerAbort') ||
      message.includes('The operation was aborted')) {
    return; // Silently ignore
  }

  // Pass through all other errors
  originalConsoleError.apply(console, args);
};
