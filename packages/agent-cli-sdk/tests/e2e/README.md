# E2E Tests

End-to-end tests that execute the real Claude CLI to test critical functionality.

## Requirements

- Claude CLI must be installed and available in your PATH (or set `CLAUDE_CLI_PATH`)
- An active Claude Code session/account

## Running E2E Tests

```bash
# Run all e2e tests
pnpm test:e2e

# Run a specific test file
pnpm test:e2e basic.test.ts

# Run tests in a specific directory
pnpm test:e2e claude/

# Run tests in watch mode (not recommended for e2e)
vitest --config vitest.e2e.config.ts --watch
```

## Test Organization

Tests are organized by CLI tool:

```
tests/e2e/
├── claude/              # Claude CLI tests
│   ├── basic.test.ts
│   ├── json.test.ts
│   └── resume.test.ts
├── codex/              # (Future) OpenAI Codex tests
├── gemini/             # (Future) Google Gemini tests
└── README.md
```

## Claude Test Files

### claude/basic.test.ts
Tests basic CLI execution:
- Simple prompt execution with callbacks
- Message structure validation
- Custom session IDs
- Model selection
- Permission modes
- Working directory

### claude/json.test.ts
Tests JSON output extraction:
- Simple JSON objects
- JSON arrays
- Nested objects
- Fallback to text when no JSON found
- Markdown code block extraction

### claude/resume.test.ts
Tests session management:
- Creating and resuming sessions
- Using `--continue` flag
- Message history preservation
- Context retention across sessions

## Important Notes

1. **E2E tests are excluded from the regular test suite** - They only run with `pnpm test:e2e`
2. **Tests run sequentially** - To avoid session conflicts and race conditions
3. **Tests have longer timeouts** - Up to 8 minutes per test to account for multiple API calls
4. **Tests use real API calls** - They will consume your Claude Code quota
5. **Session IDs must be UUIDs** - Tests use the `uuid` package to generate valid session IDs
6. **Tests are consolidated** - Each file has a single test function that runs multiple sub-tests to reduce API calls

## Configuration

E2E tests use a separate config file: `vitest.e2e.config.ts`

Key settings:
- `pool: 'forks'` with `singleFork: true` - Ensures tests run sequentially
- `testTimeout: 180000` - 3 minute timeout per test
- `include: ['tests/e2e/**/**.test.ts']` - Includes all test files in e2e subdirectories

## Test Coverage

The e2e tests provide comprehensive coverage of the Claude CLI integration:

✅ Basic execution with streaming callbacks
✅ JSON extraction and parsing
✅ Session management (create, resume, continue)
✅ Permission modes
✅ Model selection
✅ Custom session IDs
✅ Working directory handling

## Troubleshooting

### CLI Not Found
If you get "Claude CLI not found" errors:
1. Ensure Claude CLI is installed
2. Set the `CLAUDE_CLI_PATH` environment variable:
   ```bash
   export CLAUDE_CLI_PATH=/path/to/claude
   pnpm test:e2e
   ```

### Timeout Errors
If tests timeout:
- Check your internet connection
- Verify Claude API is accessible
- Increase timeout in test or config if needed

### Session Conflicts
If you get session-related errors:
- E2E tests use unique session IDs with timestamps
- Tests run sequentially to prevent conflicts
- Clear `.claude/sessions/` if needed
