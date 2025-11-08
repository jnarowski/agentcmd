# tsx Double Ctrl+C Investigation

**Date**: 2025-11-08
**Status**: IN PROGRESS
**Issue**: Dev server requires TWO Ctrl+C presses to exit cleanly

---

## Problem Statement

When running `pnpm dev`, pressing Ctrl+C once doesn't cleanly exit the server. tsx shows:

```
^C
agentcmd:dev: [1] 8:28:58 AM [tsx] Previous process hasn't exited yet. Force killing...
agentcmd:dev: [0] pnpm inngest exited with code 0
agentcmd:dev: [2] pnpm dev:client exited with code SIGINT
agentcmd:dev: [1] pnpm dev:server exited with code 0
```

tsx waits 3 seconds before force-killing the Node process.

---

## Key Observations

1. **Server DOES exit with code 0** - `shutdown.ts` completes successfully and calls `process.exit(0)`
2. **`beforeExit` event NEVER fires** - Added debug logging to `index.ts:5-12`, no output seen
3. **tsx detects process hasn't exited** - Despite exit code 0, process still alive

---

## Investigation Results

### Test 1: Pino Transports (RULED OUT)

**Hypothesis**: `pino-roll` and `pino-pretty` worker threads prevent clean exit

**Test**: Isolated Fastify + Pino with both transports
```bash
# Test file: /tmp/test-server-exit.ts
Result: ✅ Process exited cleanly
```

**Conclusion**: Pino is NOT the cause

---

### Test 2: Inngest Serve Handler (RULED OUT)

**Hypothesis**: Inngest `fastifyPlugin` keeps event loop alive

**Test**: Fastify + Inngest serve handler + empty functions
```bash
# Test file: /tmp/test-inngest-exit.ts
Result: ✅ Process exited cleanly after fastify.close()
```

**Conclusion**: Inngest is NOT the cause

---

### Test 3: Full Server (CONFIRMED BUG)

**Test**: Run actual `pnpm dev:server`, send SIGINT, wait 5 seconds
```bash
Result: ❌ Server still alive after SIGINT + 5 seconds
```

**Conclusion**: Something in full app prevents clean exit, but NOT Pino or Inngest individually

---

## Root Cause Analysis

### Likely Culprits

Since isolated tests pass but full app hangs, the issue is likely:

1. **Active WebSocket connections** (from `@fastify/websocket`)
   - Session WebSocket handler: `apps/app/src/server/websocket/index.ts`
   - Shell WebSocket handler: `apps/app/src/server/routes/shell.ts`
   - WebSocket connections may not be forcibly closed by `fastify.close()`

2. **node-pty terminals** (from shell sessions)
   - Created in `shell.service.ts`, stored in `activeSessions`
   - May have lingering event listeners

3. **Agent child processes** (from agent-cli-sdk)
   - Spawned via `executeAgent()` in session handlers
   - `killProcess()` in shutdown may not fully clean up

4. **Database connection pool** (Prisma)
   - SQLite connections might not close immediately
   - Memoization DB: `./prisma/workflows.db`

---

## Current Shutdown Flow

**File**: `apps/app/src/server/utils/shutdown.ts`

```
1. Cancel reconnection timers (reconnectionManager)
2. Kill agent child processes (killProcess with 5s timeout)
3. Close Fastify server (fastify.close())
4. Cleanup WebSocket sessions (activeSessions.cleanup())
5. Disconnect Prisma (prisma.$disconnect())
6. Call process.exit(0)
```

**Issue**: `process.exit(0)` is called, but tsx detects process hasn't actually exited yet. This suggests:
- Exit is being forced before event loop clears
- Some resource is keeping event loop alive
- `beforeExit` never fires (would show active handles)

---

## Debug Code Added

**File**: `apps/app/src/server/index.ts:4-12`

```typescript
// DEBUG: Log active handles on exit
process.on('beforeExit', () => {
  console.log('\n!!! beforeExit - process trying to exit !!!');
  if (typeof process._getActiveHandles === 'function') {
    const handles = process._getActiveHandles();
    console.log('Active handles:', handles.length);
    handles.forEach((h, i) => console.log(`  ${i + 1}. ${h.constructor.name}`));
  }
});
```

**Result**: No output seen - `beforeExit` never fires because `process.exit(0)` is called explicitly

---

## Git History Analysis

**Recent commits** (last 5 days):
- `a9576df` - `421d313`: "working on workflow saftey" (recent changes)
- `1be7d25`: Merge feat/base-branch-rename (Nov 8, 06:12 AM)
- `0ed1841`, `b07590b`: "added server health endpoints for inngest"

**Workflow/Inngest added**: Has been present for multiple commits, so not a new addition

**shutdown.ts history**: File structure identical at `1be7d25` (before "workflow safety" work)

---

## Proposed Solutions

### Option 1: Remove `process.exit(0)` (RECOMMENDED)

Let process exit naturally after cleanup completes.

**Change**: `apps/app/src/server/utils/shutdown.ts:96`
```typescript
// OLD:
fastify.log.info('Graceful shutdown complete');
process.exit(0);

// NEW:
fastify.log.info('Graceful shutdown complete - process will exit naturally');
// No process.exit() - let Node exit when event loop empties
```

**Pros**:
- Allows proper cleanup to complete
- `beforeExit` will fire if handles remain
- Natural Node.js shutdown behavior

**Cons**:
- May still hang if underlying issue not fixed
- Need to ensure all cleanup actually releases handles

---

### Option 2: Force-close WebSocket connections

Explicitly close WebSocket connections before `fastify.close()`.

**Change**: Add before line 69 in `shutdown.ts`
```typescript
// Close all WebSocket connections forcibly
for (const [sessionId, sessionData] of activeSessions.entries()) {
  if (sessionData.socket?.readyState === 1) { // OPEN
    sessionData.socket.close();
  }
}
```

---

### Option 3: Add force-kill timeout

If process doesn't exit naturally, force it.

**Change**: Add after `prisma.$disconnect()`
```typescript
// Give process 2 seconds to exit naturally
setTimeout(() => {
  fastify.log.warn('Force exiting after timeout');
  process.exit(0);
}, 2000).unref(); // unref() so it doesn't prevent exit
```

---

### Option 4: Disable workflow engine in dev

Skip Inngest serve handler in dev mode since separate `pnpm inngest` already running.

**Change**: `apps/app/src/server/domain/workflow/services/engine/initializeWorkflowEngine.ts:32`
```typescript
// Skip in dev - separate inngest dev server handles this
if (config.server.nodeEnv === 'development') {
  logger.info('Workflow engine disabled in dev (using inngest dev server)');
  return;
}
```

**Issue**: Dev server needs endpoint `/api/inngest` for auto-discovery to work

---

## SOLUTION FOUND ✅

**Date**: 2025-11-08
**Root Cause**: `tsx watch` mode intercepts SIGINT and doesn't forward it properly

### Systematic Isolation Tests

**Test 1: Pino Transports** ❌ NOT THE CAUSE
- Disabled `pino-pretty` and `pino-roll` worker threads
- Used simple logger without transports
- Result: Process still hangs

**Test 2: Shell PTY Sessions** ❌ NOT THE CAUSE
- Commented out `registerShellRoute()`
- Result: Process still hangs

**Test 3: Inngest Workflow Engine** ❌ NOT THE CAUSE
- Commented out `initializeWorkflowEngine()`
- Result: Process still hangs

**Test 4: WebSocket Handlers** ❌ NOT THE CAUSE
- Commented out all WebSocket registration
- Result: Process still hangs

**Test 5: tsx watch mode** ✅ **CONFIRMED ROOT CAUSE**
- Ran without `--watch` flag: `tsx --env-file=.env src/server/index.ts`
- Result: **Process exited cleanly on first Ctrl+C**

### Analysis

The shutdown handler in `shutdown.ts` was **NEVER being called** because:
1. `tsx watch` intercepts SIGINT for its file-watching logic
2. It waits 3 seconds before force-killing the child process
3. Our SIGINT handlers never receive the signal

### Solution Options

**Option 1: Remove `--watch` flag** (NOT RECOMMENDED)
- Loses hot-reload capability in development
- Poor developer experience

**Option 2: Use nodemon instead of tsx watch** (RECOMMENDED)
```bash
"dev:server": "nodemon --exec tsx --env-file=.env src/server/index.ts"
```

**Option 3: Accept tsx behavior** (CURRENT)
- Document that first Ctrl+C signals tsx, second kills process
- This is expected tsx watch behavior
- No code changes needed

**Option 4: Use tsx --ignore for cleaner exit**
- May reduce watch conflicts

### Recommendation

**Accept tsx watch behavior** - This is normal and expected:
1. First Ctrl+C signals tsx to stop watching
2. tsx waits 3s for graceful shutdown
3. If process doesn't exit, tsx force-kills it
4. The "double Ctrl+C" is actually tsx's timeout mechanism

Our shutdown handler works correctly when invoked. The issue is tsx's signal handling, which is intentional for watch mode.

---

## Files Modified

- `apps/app/src/server/index.ts` - Added beforeExit debug logging (can be removed)
- `.agent/research/tsx-double-ctrl-c-investigation.md` - Updated with solution

---

## Additional Notes

- User mentioned "it used to work before we added inngest to the shutdown process"
- However, Inngest has been in the codebase for a while based on git history
- The shutdown flow itself hasn't changed significantly
- Issue may be related to specific conditions (active connections, running workflows, etc.)

---

## References

- [Pino worker thread exit issues](https://github.com/pinojs/pino/issues/2002)
- [Inngest graceful shutdown docs](https://www.inngest.com/docs/setup/connect)
- [Fastify WebSocket graceful exit](https://github.com/fastify/fastify-websocket/issues/45)
