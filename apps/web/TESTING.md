# Testing Guide

## Overview

This project uses [Vitest](https://vitest.dev/) for both server-side and client-side testing, with automatic environment detection based on file location.

## Quick Start

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

## Test Structure

### Server Tests (`src/server/**/*.test.ts`)
- Environment: **Node.js**
- Use for: Services, routes, utilities, business logic
- Example: `project-sync.service.test.ts`

### Client Tests (`src/client/**/*.test.ts`)
- Environment: **happy-dom** (lightweight DOM simulation)
- Use for: React hooks, components, utilities
- Example: `useProjects.test.ts`

## Writing Tests

### Server-Side Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myService } from '../my-service';

// Mock dependencies
vi.mock('../dependency', () => ({
  dependency: vi.fn(),
}));

describe('MyService', () => {
  it('should do something', async () => {
    const result = await myService.doSomething();
    expect(result).toBe(expected);
  });
});
```

### Client-Side Example

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyHook } from '../useMyHook';
import React from 'react';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
}

describe('useMyHook', () => {
  it('should fetch data', async () => {
    const { result } = renderHook(() => useMyHook(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

## Available Test Utilities

### Vitest Globals
- `describe`, `it`, `test` - Test organization
- `expect` - Assertions
- `beforeEach`, `afterEach` - Setup/teardown
- `beforeAll`, `afterAll` - Suite-level setup
- `vi` - Mocking utilities

### React Testing Library
- `render` - Render React components
- `renderHook` - Test React hooks
- `waitFor` - Wait for async updates
- `screen` - Query rendered elements
- `fireEvent` - Trigger events

## Test Patterns

### Mocking Services

```typescript
vi.mock('../services/project.service', () => ({
  projectService: {
    createOrUpdateProject: vi.fn(),
    getProjectByPath: vi.fn(),
  },
}));
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const promise = asyncFunction();
  await expect(promise).resolves.toBe(expectedValue);
});
```

### Testing Errors

```typescript
it('should throw error', async () => {
  await expect(failingFunction()).rejects.toThrow('Error message');
});
```

### File System Testing

```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

beforeEach(async () => {
  const testDir = path.join(os.tmpdir(), 'test-data');
  await fs.mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});
```

## Coverage

Generate coverage reports:

```bash
pnpm test:coverage
```

Coverage reports are generated in `coverage/` directory and include:
- `coverage/index.html` - Interactive HTML report
- `coverage/coverage-final.json` - JSON data
- Console output with coverage summary

## Continuous Integration

Tests run automatically in CI. All tests must pass before merging.

## Current Test Suites

### ProjectSyncService (14 tests)
- Message counting and filtering logic
- Project import/update detection
- Path extraction from JSONL files
- Error handling

### useProjects (3 tests)
- React Query hook behavior
- API interaction
- Query key generation

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Don't make real API calls or database queries
3. **Use Descriptive Names**: Test names should explain what's being tested
4. **Arrange-Act-Assert**: Structure tests clearly
5. **Test Edge Cases**: Include error scenarios and boundary conditions
6. **Keep Tests Fast**: Mock slow operations
7. **Test Behavior, Not Implementation**: Focus on outcomes, not internals

## Troubleshooting

### Tests Fail Intermittently
- Add `await waitFor()` for async operations
- Increase timeout if needed: `it('test', () => {}, 10000)`

### Mocks Not Working
- Clear mocks with `vi.clearAllMocks()` in `beforeEach`
- Verify mock path matches import path exactly

### Environment Issues
- Server tests should use Node.js environment
- Client tests should use happy-dom environment
- Check file location matches pattern in `vitest.config.ts`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
