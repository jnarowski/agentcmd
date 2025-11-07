# Feature: Fix Token Counting Duplication

## What We're Building

Fix the token counting system that currently shows millions of tokens due to double-counting. Replace the current metadata-based approach with a memoized selector that calculates total tokens by summing from messages in the store, ensuring each message is counted exactly once.

## User Story

As a user viewing session token counts
I want to see accurate token totals that increment correctly with each message
So that I can track my actual API usage without duplication or exponential growth

## Technical Approach

Replace the current dual-tracking system (metadata + client calculation) with a single source of truth: a memoized Zustand selector that sums token usage from all assistant messages in the store. Remove expensive JSONL re-parsing on the server after each message completion. Messages loaded from JSONL already contain usage data, and new messages get usage attached from WebSocket events.

## Files to Touch

### Existing Files

- `apps/web/src/server/websocket.ts` - Remove JSONL re-parsing after message completion (lines 213-230)
- `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts` - Add selectTotalTokens selector, remove metadata-based token tracking
- `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts` - Attach usage data to assistant messages on completion
- `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx` - Use selector instead of metadata for token display
- `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx` - Simplify token display (remove +X indicator)
- `apps/web/src/client/pages/projects/sessions/stores/sessionStore.test.ts` - Add tests for selectTotalTokens selector

### New Files

None - all changes are to existing files

## Implementation Plan

### Phase 1: Foundation

Add the memoized selector to calculate tokens from messages array. This establishes the single source of truth for token counts before we remove the old metadata-based tracking.

### Phase 2: Core Implementation

Update the WebSocket message completion handler to attach usage data to messages, and update the server to stop re-parsing JSONL files. This fixes the duplication at the source.

### Phase 3: Integration

Update all UI components to use the new selector, remove old metadata fields, and add comprehensive tests to prevent regression.

## Step by Step Tasks

### 1: Add Memoized Selector

<!-- prettier-ignore -->
- [x] 1.1 Add selectTotalTokens selector to sessionStore
        - Export memoized selector that sums tokens from all assistant messages
        - Handle all token types: input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens
        - Return 0 if no session or no messages
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
        - Add after the store definition (around line 350)

#### Completion Notes

- Added `selectTotalTokens` selector at line 368 after store definition
- Selector sums all four token types from assistant messages with usage data
- Returns 0 for empty messages array or null session
- Properly filters to only count assistant messages (user messages have no usage data)

### 2: Update Message Completion Handler

<!-- prettier-ignore -->
- [x] 2.1 Attach usage to assistant messages in handleMessageComplete
        - When message_complete event arrives with usage data, update the last assistant message
        - Create updated messages array with usage attached to last message
        - Update store with new messages array
        - File: `apps/web/src/client/pages/projects/sessions/hooks/useSessionWebSocket.ts`
        - Modify handleMessageComplete function (around line 75-93)

#### Completion Notes

- Updated `SessionMessageCompleteData` type to have `usage` at top-level with all 4 token types
- Modified `handleMessageComplete` to attach usage data to last assistant message
- Creates new messages array immutably and updates store via setState
- Falls back to old finalizeMessage behavior if no usage data provided
- Metadata still updated for other fields like model and stop_reason

### 3: Remove Server JSONL Re-parsing

<!-- prettier-ignore -->
- [x] 3.1 Remove JSONL parsing after message completion
        - Delete lines 213-230 (parseJSONLFile call and updateSessionMetadata)
        - Keep usage extraction from response.events (lines 270-318)
        - This is the expensive operation causing duplication
        - File: `apps/web/src/server/websocket.ts`
- [x] 3.2 Simplify message_complete event payload
        - Change from sending { metadata: { ...metadata, usage } } to just { usage }
        - Remove metadata parameter from sendMessage call (line 330-338)
        - File: `apps/web/src/server/websocket.ts`

#### Completion Notes

- Removed entire JSONL re-parsing block (lines 213-230) that was causing duplication
- Updated usage extraction to include all 4 token types (input, output, cache_creation, cache_read)
- Simplified message_complete payload to only send `{ usage }` instead of nested metadata structure
- Server now extracts usage once from response.events and sends directly to client
- Messages loaded from JSONL already have usage data, so no re-parsing needed

### 4: Update UI Components

<!-- prettier-ignore -->
- [x] 4.1 Update ProjectSession to use selector
        - Import selectTotalTokens from sessionStore
        - Replace `session?.metadata?.totalTokens || 0` with `useSessionStore(selectTotalTokens)`
        - Remove currentMessageTokens variable (no longer needed)
        - File: `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`
        - Around line 342-343
- [x] 4.2 Simplify ChatPromptInput token display
        - Remove the (+X tokens) green indicator
        - Show only total tokens: `{totalTokens.toLocaleString()} tokens`
        - Remove currentMessageTokens prop (no longer passed from parent)
        - File: `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`
        - Around line 384-399

#### Completion Notes

- Imported and used `selectTotalTokens` selector in ProjectSession at line 35
- Updated ChatPromptInput to only pass `totalTokens` prop (removed currentMessageTokens)
- Removed currentMessageTokens from ChatPromptInputProps interface
- Simplified token display to show only `{totalTokens.toLocaleString()} tokens`
- Removed green (+X) indicator for streaming message tokens

### 5: Clean Up Store

<!-- prettier-ignore -->
- [x] 5.1 Remove unused metadata fields from SessionData interface
        - Remove currentMessageTokens from SessionData type
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
        - Around line 44-45
- [x] 5.2 Simplify updateMetadata function
        - Remove usage calculation logic (lines 297-308)
        - Just merge metadata without computing tokens
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
        - Lines 288-327

#### Completion Notes

- Removed `currentMessageTokens` from SessionData interface (line 46)
- Removed all references to currentMessageTokens in store functions (loadSession, addMessage)
- Removed currentMessageTokens initialization in ProjectSession.tsx
- Simplified updateMetadata to just merge metadata without any token calculations
- Removed usage parameter type from updateMetadata (now just Partial<AgentSessionMetadata>)
- Store is now cleaner with single source of truth for tokens via selectTotalTokens

### 6: Add Comprehensive Tests

<!-- prettier-ignore -->
- [x] 6.1 Add selectTotalTokens test - basic calculation
        - Test with 2 assistant messages with full usage data
        - Verify sum includes all token types: input, output, cache_creation, cache_read
        - Expected: (10+5+100+50) + (20+10+0+75) = 270
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.test.ts`
- [x] 6.2 Add selectTotalTokens test - no messages
        - Test with empty messages array
        - Expected: 0
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.test.ts`
- [x] 6.3 Add selectTotalTokens test - no session
        - Test with null session
        - Expected: 0
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.test.ts`
- [x] 6.4 Add selectTotalTokens test - ignore user messages
        - Test with user messages only (they have no usage data)
        - Expected: 0
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.test.ts`
- [x] 6.5 Add selectTotalTokens test - mixed messages
        - Test with user messages + assistant messages with/without usage
        - Only count assistant messages that have usage data
        - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.test.ts`
- [x] 6.6 Run tests
        - Command: `pnpm test sessionStore.test.ts`
        - Expected: All new tests pass

#### Completion Notes

- Added 5 comprehensive tests for selectTotalTokens in new test suite
- Test 1: Basic calculation with 2 assistant messages (expected 270 tokens)
- Test 2: Empty messages array (expected 0)
- Test 3: Null session (expected 0)
- Test 4: User messages only (expected 0)
- Test 5: Mixed messages with assistant messages with/without usage (expected 65)
- Removed all currentMessageTokens references from existing tests
- Updated updateMetadata test to reflect simplified implementation
- Added missing agent field to test session objects

## Acceptance Criteria

**Must Work:**

- [ ] New session shows 0 tokens initially
- [ ] First message increments token count correctly (e.g., 1000 tokens)
- [ ] Second message increments from previous total (e.g., 1000 → 1500)
- [ ] Token counts grow linearly, not exponentially
- [ ] Session reload from JSONL shows correct total tokens
- [ ] No duplication when sending multiple messages in sequence
- [ ] All token types are counted (input, output, cache_creation, cache_read)
- [ ] User messages are ignored (they don't have usage data)

**Should Not:**

- [ ] Re-parse JSONL file after every message (performance issue)
- [ ] Double-count tokens from any message
- [ ] Show millions/billions of tokens for normal sessions
- [ ] Break existing session loading from JSONL
- [ ] Cause any console errors or warnings

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm lint
# Expected: No lint errors

# Unit tests
pnpm test sessionStore.test.ts
# Expected: All tests pass (including 5 new selectTotalTokens tests)

# Build verification
pnpm build
# Expected: Successful build with no errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: Projects → Select a project → Create new session
3. Verify: Token count shows "0 tokens" initially
4. Send first message: "Hello"
5. Verify: Token count increases (e.g., "1,234 tokens") - NOT millions
6. Send second message: "How are you?"
7. Verify: Token count increments correctly (e.g., "1,234 tokens" → "2,456 tokens")
8. Check console: No errors or warnings
9. Refresh page (reload session from JSONL)
10. Verify: Token count persists correctly (still shows ~2,456 tokens)
11. Send third message: "Tell me about TypeScript"
12. Verify: Token count continues to increment linearly (e.g., 2,456 → 3,890)

**Feature-Specific Checks:**

- Open browser DevTools → Network → WS filter
- Send a message and watch for `session.*.message_complete` event
- Verify payload contains `usage` object (not metadata.totalTokens)
- Check Redux/Zustand DevTools: messages array should have usage data attached to assistant messages
- Verify no JSONL file parsing happens after message completion (check server logs)
- Test with an existing session that has many messages - should load quickly without re-parsing

## Definition of Done

- [ ] All tasks completed
- [ ] All 5 new tests passing
- [ ] Lint and Type Checks pass
- [ ] Manual testing confirms linear token growth (no duplication)
- [ ] No console errors
- [ ] Token counts accurate for new sessions, existing sessions, and after reload
- [ ] Server no longer re-parses JSONL after each message
- [ ] Code follows existing Zustand selector patterns

## Notes

**Key Design Decision**: Messages loaded from JSONL already contain usage data in the assistant message objects. We don't need to re-parse the file or track tokens separately in metadata. The memoized selector recalculates only when the messages array changes, making it efficient.

**Performance**: Removing JSONL re-parsing after each message significantly improves performance, especially for sessions with many messages (e.g., 50+ exchanges).

**Migration**: No data migration needed - existing sessions will work immediately because JSONL files already contain usage data in assistant messages.

**Future Consideration**: If we want to show "current message tokens" (+X indicator) in the future, we can add a simple `selectCurrentMessageTokens` selector that returns tokens from the last assistant message.
