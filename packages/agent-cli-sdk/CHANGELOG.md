# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-29

### Breaking Changes

- **Package name:** Standardized to `@repo/agent-cli-sdk` (removed `-two` suffix from all references)
- **Permission types:** Consolidated to single `PermissionMode` type
  - Removed `ClaudePermissionMode`, `CodexPermissionMode`, `GeminiPermissionMode`
  - Use `PermissionMode` directly everywhere (no backwards compatibility aliases)
- **detectCli():** All detection functions are now async and must use `await`
  - Changed: `detectCli()` → `async detectCli()`
  - Affects: `detectClaudeCli()`, `detectCodexCli()`, `detectGeminiCli()`
- **loadSession():** Gemini now returns `[]` instead of throwing on missing session (consistent with Claude/Codex)

### Added

- **Utility functions** for common patterns:
  - `createLineBuffer()` - Handle streaming JSONL with line buffering
  - `detectCliGeneric()` - Generic CLI detection pattern
  - `permissionModeToFlags()` - Convert permission modes to CLI flags
  - `workingDirToFlags()` - Convert working directory to CLI flags
  - `extractSessionIdFromEvents()` - Extract session IDs from event arrays
- **Type definitions:**
  - `BaseExecuteOptions` - Documents common execute options pattern
  - `BaseExecuteCallbacks` - Documents common callback pattern
  - Exported from main index for public API
- **Codex Support**: Full implementation for OpenAI Codex CLI integration
  - Session loading and parsing from JSONL files
  - Real-time command execution with callbacks
  - Automatic CLI detection
  - Unified message format transformation
- **Comprehensive documentation:**
  - Architecture section in README explaining design principles
  - Updated CHANGELOG to track version history
  - Documented all utility functions with JSDoc

### Changed

- **Gemini status:** Marked as experimental (70% complete) instead of planned
- **Error handling:** Standardized across all tools
  - All `loadSession()` functions return `[]` on missing session files
  - Only throw on actual errors (corrupt data, permissions, etc.)
- **CLI detection:** All detection functions now use shared `detectCliGeneric()` utility
  - Reduced code duplication from ~50 lines per tool to ~20 lines
  - Consistent detection strategy across all tools

### Fixed

- **Async/await consistency:** Fixed `getCapabilities()` awaiting non-async `detectCli()` functions
- **Line buffering edge cases:** Improved handling of incomplete lines in streaming output
- **Session loading:** Gemini no longer throws on missing session files
- **Package naming:** Fixed all references from `@repo/agent-cli-sdk-two` to `@repo/agent-cli-sdk`

### Technical Details

**Code Reduction:**
- Removed ~150-200 lines of duplicated code
- Extracted 4 utility functions with comprehensive test coverage
- Maintained tool-specific logic for clarity and readability

**Test Coverage:**
- Added 69 new tests for utility functions
- All 281 tests passing (unit + integration + E2E)
- Full type-check and lint compliance

**Philosophy:**
- Medium abstraction bar: Only extract when duplicated 2+ times AND 20+ lines
- Functional approach: Pure utility functions, no wrappers or base classes
- Tool-specific clarity: Each tool maintains its own execute/parse logic

**Provider Support:**
- Claude Code: Production ready ✅
- OpenAI Codex: Production ready ✅
- Google Gemini: Experimental (70%) 🟡
- Cursor AI: Planned ❌

### Migration Notes

**Breaking changes from 0.x to 1.0:**

1. **Update imports:**
   ```typescript
   // Before (0.x)
   import type { ClaudePermissionMode } from '@repo/agent-cli-sdk-two';

   // After (1.0)
   import type { PermissionMode } from '@repo/agent-cli-sdk';
   ```

2. **Async detection functions:**
   ```typescript
   // Before (0.x)
   const path = detectClaudeCli();

   // After (1.0)
   const path = await detectClaudeCli();
   ```

3. **Gemini error handling:**
   ```typescript
   // Before (0.x) - would throw
   try {
     const messages = loadGeminiSession({ sessionId: 'missing' });
   } catch (error) {
     // Handle missing session
   }

   // After (1.0) - returns []
   const messages = loadGeminiSession({ sessionId: 'missing' });
   // messages === []
   ```

---

## Future Roadmap

- Support for OpenAI Codex
- Support for Google Gemini
- Support for Cursor AI
- Enhanced streaming capabilities
- Improved error handling and recovery
- CLI installation helpers
- Additional permission modes
- Plugin system for custom tools
