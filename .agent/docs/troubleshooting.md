# Troubleshooting Guide

Common issues and solutions for development in agentcmd.

## Type Errors

### 1. Prisma Type Errors

**Error:** Property doesn't exist on Prisma type

**Cause:** Prisma client out of sync with schema

**Solution:**

```bash
pnpm prisma:generate
```

If persists:

```bash
rm -rf node_modules
pnpm install
pnpm prisma:generate
```

### 2. Null vs Undefined Mixing

**Error:** Type 'null' is not assignable to type 'undefined'

**Cause:** Mixing database nulls with TypeScript undefined

**Solution:**

```typescript
// ✅ DO - Database fields use null
interface Project {
  description: string | null; // Prisma field
}

// ✅ DO - React props use undefined
interface Props {
  description?: string; // Optional prop
}

// ❌ DON'T - Mix both
interface Project {
  description: string | null | undefined; // Wrong
}
```

### 3. Import Path Errors

**Error:** Module not found or circular dependency

**Cause:** Wrong import paths or missing @/ alias

**Solution:**

```typescript
// ✅ DO - Use @/ aliases
import { getProjectById } from "@/server/domain/project/services/getProjectById";

// ❌ DON'T - Relative paths
import { getProjectById } from "../../../domain/project/services/getProjectById";

// ❌ DON'T - File extensions
import { getProjectById } from "@/server/domain/project/services/getProjectById.js";
```

### 4. Deprecated Services Import

**Error:** Can't resolve `services/project.service`

**Cause:** Importing from deprecated services/ directory

**Solution:**

```typescript
// ✅ DO - Use domain services
import { getProjectById } from "@/server/domain/project/services/getProjectById";

// ❌ DON'T - Old services directory
import { getProjectById } from "@/server/services/project.service";
```

### 5. Inline Import Types

**Error:** Type is too complex

**Cause:** Using inline imports instead of top-level

**Solution:**

```typescript
// ✅ DO - Import at top
import type { PhaseDefinition } from "agentcmd-workflows";

function foo(phase: PhaseDefinition) {}

// ❌ DON'T - Inline imports
function foo(phase: import("agentcmd-workflows").PhaseDefinition) {}
```

## Runtime Errors

### 6. WebSocket Not Connecting

**Symptoms:** No real-time updates, connection failed

**Causes & Solutions:**

**JWT Token Missing:**

```typescript
// Check token in authStore
const token = useAuthStore((state) => state.token);
console.log("Token:", token); // Should not be null
```

**Server Not Running:**

```bash
# Check if server is running
curl http://localhost:3456/api/health

# If not, start it
pnpm dev
```

**CORS Issues:**

```typescript
// Check CORS configuration in server
// apps/app/src/server/index.ts
fastify.register(cors, {
  origin: ["http://localhost:5173"],
  credentials: true,
});
```

### 7. Database Locked

**Error:** `SQLITE_BUSY: database is locked`

**Causes:**

- Multiple node processes
- Long transactions
- Concurrent writes

**Solution:**

```bash
# Kill all node processes
pkill node

# Restart dev
pnpm dev

# If persists, reset database
rm apps/app/prisma/dev.db
pnpm prisma:reset
```

### 8. Agent Not Streaming

**Symptoms:** Agent doesn't respond, no output

**Causes & Solutions:**

**CLI Not Installed:**

```bash
# Check if Claude CLI installed
which claude

# If not found, install:
# See https://claude.ai/download
```

**Wrong Agent Type:**

```typescript
// Verify agent type is correct
const session = await executeAgent({
  agentType: "claude", // Must match installed CLI
  // ...
});
```

**Check Logs:**

```bash
# Watch server logs
tail -f apps/app/logs/app.log | jq .

# Filter for agent errors
grep "agent" apps/app/logs/app.log | jq 'select(.level >= 50)'
```

### 9. Infinite Re-renders

**Symptoms:** Component re-renders constantly, browser freezes

**Cause:** Objects/arrays in useEffect dependencies

**Solution:**

```typescript
// ✅ DO - Extract primitives
const { userId, projectId } = project;

useEffect(() => {
  loadData(userId, projectId);
}, [userId, projectId]);

// ❌ DON'T - Object dependencies
useEffect(() => {
  loadData(project);
}, [project]); // Causes infinite loop
```

### 10. Zustand State Mutation

**Symptoms:** State doesn't update, stale data

**Cause:** Mutating state instead of replacing

**Solution:**

```typescript
// ✅ DO - Immutable updates
set((state) => ({
  messages: [...state.messages, newMessage],
}));

// ❌ DON'T - Mutation
set((state) => {
  state.messages.push(newMessage);
  return { messages: state.messages };
});
```

## Build Errors

### 11. TypeScript Build Fails

**Error:** Build fails with type errors

**Solutions:**

```bash
# Clear and rebuild
rm -rf dist
rm -rf node_modules/.vite
pnpm build

# Check types explicitly
pnpm check-types

# Regenerate Prisma client
pnpm prisma:generate
```

### 12. Module Resolution Errors

**Error:** Can't resolve module in build

**Cause:** Missing dependencies or wrong imports

**Solutions:**

```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install

# Verify import paths use @/ aliases
# Check tsconfig.json paths are correct
```

### 13. Vite Build Errors

**Error:** Build fails in Vite

**Solutions:**

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Clear dist
rm -rf apps/app/dist

# Rebuild
pnpm build
```

## Dev Server Issues

### 14. Port Already in Use

**Error:** Port 3456 or 5173 already in use

**Solution:**

```bash
# Find process using port
lsof -i :3456
lsof -i :5173

# Kill process
kill -9 <PID>

# Or kill all node
pkill node

# Restart
pnpm dev
```

### 15. Hot Reload Not Working

**Symptoms:** Changes don't reflect in browser

**Solutions:**

```bash
# Restart dev server
# Ctrl+C then pnpm dev

# Clear Vite cache
rm -rf node_modules/.vite

# Hard refresh browser
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

## Migration Issues

### 16. Migration Conflicts

**Error:** Migration conflict after git pull

**Solution:**

```bash
# Reset and reapply
pnpm prisma migrate reset

# Or manually resolve:
# 1. Check prisma/migrations/ for conflicts
# 2. Resolve conflicts
# 3. Run: pnpm prisma migrate dev
```

### 17. Failed Migration

**Error:** Migration failed to apply

**Solution:**

```bash
# Check migration SQL
cat prisma/migrations/<migration>/migration.sql

# If invalid, delete migration
rm -rf prisma/migrations/<migration>

# Fix schema and recreate
pnpm prisma:migrate
```

## Performance Issues

### 18. Slow Queries

**Symptoms:** API responses slow, database queries taking long

**Solutions:**

```typescript
// Add indexes to frequently queried fields
// In schema.prisma:
model Session {
  projectId String
  userId    String

  @@index([projectId])
  @@index([userId])
}

// Then migrate
pnpm prisma:migrate
```

**Use select to limit fields:**

```typescript
// ✅ DO - Select only needed fields
const project = await prisma.project.findUnique({
  where: { id },
  select: { id: true, name: true },
});

// ❌ DON'T - Select all fields
const project = await prisma.project.findUnique({
  where: { id },
});
```

### 19. Large Bundle Size

**Symptoms:** Slow page load, large JavaScript files

**Solutions:**

```typescript
// Use dynamic imports for large dependencies
const HeavyComponent = lazy(() => import("./HeavyComponent"));

// Code split routes
const ProjectPage = lazy(() => import("./pages/ProjectPage"));
```

## Debugging Tips

### Enable Debug Logging

**Backend:**

```bash
# Set log level in .env
LOG_LEVEL=debug

# Restart server
pnpm dev:server
```

**Frontend:**

```typescript
// Enable React DevTools
// Install: https://react.dev/learn/react-developer-tools

// Log all WebSocket events
socket.onAny((event, data) => {
  console.log("WebSocket:", event, data);
});
```

### Check Health Endpoint

```bash
# Verify server is healthy
curl http://localhost:3456/api/health

# Should return: { "status": "ok" }
```

### Watch Logs

```bash
# Real-time log watching
tail -f apps/app/logs/app.log | jq .

# Filter by level
tail -f apps/app/logs/app.log | jq 'select(.level >= 50)'

# Search for errors
grep "error" apps/app/logs/app.log | jq .
```

### Browser DevTools

**Network Tab:**

- Check API requests/responses
- View WebSocket messages
- Verify authentication headers

**Console Tab:**

- Check for JavaScript errors
- View console.log output
- Test code snippets

**React DevTools:**

- Inspect component tree
- View props/state
- Profile performance

## Quick Solutions

**Type errors:** `pnpm prisma:generate && pnpm check-types`
**Database locked:** `pkill node && pnpm dev`
**Build fails:** `rm -rf node_modules dist && pnpm install && pnpm build`
**Hot reload broken:** Restart dev server
**WebSocket not connecting:** Check token, restart server
**Infinite re-renders:** Check useEffect deps (use primitives only)
**Migration conflict:** `pnpm prisma migrate reset`

## Related Docs

- `.agent/docs/backend-patterns.md` - Domain services, error handling
- `.agent/docs/frontend-patterns.md` - React patterns, state management
- `.agent/docs/database-guide.md` - Prisma patterns, migrations
- `.agent/docs/websocket-architecture.md` - WebSocket troubleshooting
