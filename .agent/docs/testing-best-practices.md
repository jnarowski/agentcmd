# Testing Best Practices

Test **behavior**, not implementation. If tests break on refactoring (without behavior changes), you're testing the wrong thing.

## Core Rules

✅ **DO**
- Test user-visible behavior and outcomes
- Use real dependencies (Prisma, utilities, stores)
- Mock only external APIs and uncontrollable I/O
- Reset state in `beforeEach`/`afterEach`
- Test edge cases and errors

❌ **DON'T**
- Test internal details (state, function calls)
- Over-mock (utils, business logic, Prisma)
- Use brittle selectors (CSS classes, DOM structure)
- Test library behavior
- Write tests that break on refactoring

## Mocking Decision

**When to mock:**
- External APIs (fetch, third-party services)
- Timers, uncontrollable I/O

**Use real implementation:**
- Prisma (fast with SQLite)
- Utilities and helpers
- Zustand stores (reset in `beforeEach`)
- Internal business logic

## Testing Patterns

### Unit Tests

Test inputs → outputs.

```typescript
it("should extract JSON from mixed text", () => {
  expect(extractJSON('{"status":"ok"}')).toEqual({ status: "ok" });
  expect(extractJSON("plain text")).toBeNull();
});
```

### React Components

Test user behavior, not React internals.

```typescript
it('should submit form with entered credentials', async () => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(<LoginForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/username/i), 'testuser');
  await user.type(screen.getByLabelText(/password/i), 'pass123');
  await user.click(screen.getByRole('button', { name: /log in/i }));

  expect(onSubmit).toHaveBeenCalledWith({
    username: 'testuser',
    password: 'pass123',
  });
});
```

**Query priority:** `getByRole` > `getByLabelText` > `getByPlaceholderText` > `getByTestId`

### Backend/Services

Use real Prisma and filesystem.

```typescript
describe("syncProjectSessions", () => {
  beforeEach(async () => {
    await prisma.project.create({
      data: { id: "test-id", name: "Test", path: testDir, userId: "user-id" }
    });
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await prisma.project.deleteMany();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should sync sessions", async () => {
    await fs.writeFile(path.join(testDir, "session.jsonl"), "{}");

    const result = await syncProjectSessions("test-id", "user-id");

    expect(result.synced).toBe(1);
  });
});
```

**Why real Prisma:**
- Fast (SQLite)
- Tests actual constraints
- No mock maintenance

### Zustand Stores

Use real store, reset in `beforeEach`.

```typescript
describe("SessionStore", () => {
  beforeEach(() => {
    useSessionStore.setState({ sessionId: null, messages: [] });
    vi.clearAllMocks();
  });

  it("should add message", () => {
    const { addMessage } = useSessionStore.getState();

    addMessage({ id: "msg-1", role: "user", content: [{ type: "text", text: "Hi" }] });

    expect(useSessionStore.getState().messages).toHaveLength(1);
  });
});
```

## What NOT to Test

❌ **Over-mocking**
```typescript
// BAD
vi.mock("./utils", () => ({ formatDate: vi.fn(() => "2025-01-01") }));

// GOOD
import { formatDate } from "./utils"; // Use real implementation
```

❌ **React internals**
```typescript
// BAD
expect(wrapper.state("username")).toBe("");

// GOOD
expect(screen.getByRole("textbox", { name: /username/i })).toHaveValue("");
```

❌ **Library behavior** - Trust third-party libraries work

## Edge Cases

Always test:
- Happy path
- Empty/null/undefined
- Malformed data
- Error conditions
- Boundary values

```typescript
describe("parseJSONLFile", () => {
  it("should parse valid JSONL", async () => { /* ... */ });
  it("should handle malformed JSON", async () => { /* ... */ });
  it("should handle empty files", async () => { /* ... */ });
  it("should throw on read errors", async () => {
    await expect(parseJSONLFile("missing.jsonl")).rejects.toThrow();
  });
});
```

## Running Tests

```bash
pnpm test                                 # All tests
pnpm test:watch                           # Watch mode
pnpm vitest run src/path/to/file.test.ts  # Single file
```
