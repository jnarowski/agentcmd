# Database Guide

Comprehensive guide to database patterns, Prisma usage, and migrations in agentcmd.

## Tech Stack

- **Prisma** - ORM and migration tool
- **SQLite** - Database (development and production)
- **Zod** - Runtime validation

## Prisma Client Singleton

### Always Use Shared Instance

NEVER create new PrismaClient instances - always import the singleton.

```typescript
// ✅ DO - Import singleton
import { prisma } from "@/shared/prisma";

const project = await prisma.project.findUnique({
  where: { id: projectId },
});

// ❌ DON'T - Creates connection leak
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
```

**Singleton Implementation:**
```typescript
// apps/app/src/shared/prisma.ts

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**Why Singleton:**
- Prevents connection pool exhaustion
- Reuses connections efficiently
- Avoids "too many connections" errors

## Database Schema

### Key Models

```prisma
// apps/app/prisma/schema.prisma

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects  Project[]
  sessions  Session[]
}

model Project {
  id        String   @id @default(cuid())
  name      String
  path      String
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User @relation(fields: [userId], references: [id])
  sessions  Session[]
  workflows WorkflowDefinition[]
}

model Session {
  id           String   @id @default(cuid())
  projectId    String
  userId       String
  agentType    String
  status       String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  project      Project @relation(fields: [projectId], references: [id])
  user         User @relation(fields: [userId], references: [id])
  messages     Message[]
}

model WorkflowDefinition {
  id          String   @id @default(cuid())
  name        String
  description String?
  projectId   String
  steps       Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project @relation(fields: [projectId], references: [id])
  runs        WorkflowRun[]
}

model WorkflowRun {
  id           String   @id @default(cuid())
  workflowId   String
  status       String
  startedAt    DateTime?
  completedAt  DateTime?
  error        String?
  createdAt    DateTime @default(now())

  workflow     WorkflowDefinition @relation(fields: [workflowId], references: [id])
  steps        WorkflowRunStep[]
}
```

## Migration Workflows

### Development Workflow

```bash
# Create and apply migration
pnpm prisma:migrate

# This runs: prisma migrate dev --name <migration-name>
# Prompts for migration name
# Creates migration in prisma/migrations/
# Applies to database
# Regenerates Prisma client
```

**Steps:**
1. Modify `prisma/schema.prisma`
2. Run `pnpm prisma:migrate`
3. Enter migration name (e.g., "add_workflow_tables")
4. Migration applied automatically
5. Prisma client regenerated

### Production Workflow

```bash
# Apply pending migrations (no dev mode)
pnpm prisma migrate deploy

# This runs: prisma migrate deploy
# Applies all pending migrations
# No prompts or client regeneration
```

**Deployment Steps:**
1. Push code with new migrations to production
2. Run `pnpm prisma migrate deploy`
3. Restart application

### Pre-1.0 Migration Reset

Before 1.0 release, can flatten migrations to reduce clutter.

```bash
# Reset and create fresh migration
pnpm prisma:reset

# This runs:
# 1. rm -rf prisma/migrations/
# 2. prisma migrate dev --name init

# WARNING: Destructive in development
# Drops database and recreates from schema
```

**When to Use:**
- Accumulating too many migrations (> 50)
- Want clean migration history
- Pre-1.0 development only
- NEVER in production

### Generate Client Only

```bash
# Regenerate Prisma client without migrations
pnpm prisma:generate

# This runs: prisma generate
# Use after pulling schema changes
# No database changes
```

## Query Patterns

### Basic CRUD

```typescript
// Create
const project = await prisma.project.create({
  data: {
    name: "New Project",
    path: "/path/to/project",
    userId: "user-123",
  },
});

// Read
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: { user: true, sessions: true },
});

// Update
const updated = await prisma.project.update({
  where: { id: projectId },
  data: { name: "Updated Name" },
});

// Delete
await prisma.project.delete({
  where: { id: projectId },
});
```

### Relations

```typescript
// Include relations
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: {
    user: true,
    sessions: {
      orderBy: { createdAt: "desc" },
      take: 10,
    },
  },
});

// Select specific fields
const project = await prisma.project.findUnique({
  where: { id: projectId },
  select: {
    id: true,
    name: true,
    user: {
      select: {
        email: true,
      },
    },
  },
});
```

### Filtering

```typescript
// Where clauses
const projects = await prisma.project.findMany({
  where: {
    userId: "user-123",
    createdAt: {
      gte: new Date("2024-01-01"),
    },
    name: {
      contains: "test",
      mode: "insensitive",
    },
  },
});

// AND / OR
const projects = await prisma.project.findMany({
  where: {
    OR: [
      { name: { contains: "test" } },
      { name: { contains: "demo" } },
    ],
    AND: [
      { userId: "user-123" },
    ],
  },
});
```

### Counting

```typescript
// Count records
const sessionCount = await prisma.session.count({
  where: { projectId },
});

// Count with aggregation
const result = await prisma.session.aggregate({
  where: { projectId },
  _count: true,
  _max: { createdAt: true },
});
```

### Transactions

```typescript
// Transaction with multiple operations
const result = await prisma.$transaction(async (tx) => {
  const project = await tx.project.create({
    data: { name, path, userId },
  });

  const session = await tx.session.create({
    data: {
      projectId: project.id,
      userId,
      agentType: "claude",
      status: "active",
    },
  });

  return { project, session };
});

// Sequential operations
const [deleteMessages, deleteSession] = await prisma.$transaction([
  prisma.message.deleteMany({ where: { sessionId } }),
  prisma.session.delete({ where: { id: sessionId } }),
]);
```

## Type Safety

### Prisma Types

Use generated Prisma types for type safety.

```typescript
import type { Project, Session, User } from "@prisma/client";

// With relations
import type { Prisma } from "@prisma/client";

type ProjectWithSessions = Prisma.ProjectGetPayload<{
  include: { sessions: true };
}>;

// Partial types
type ProjectUpdate = Prisma.ProjectUpdateInput;
```

### Null vs Undefined

Database fields use `null`, not `undefined`.

```typescript
// ✅ DO - Database types use null
interface Project {
  id: string;
  name: string;
  description: string | null; // Nullable field
}

// ❌ DON'T - Don't use undefined for database fields
interface Project {
  id: string;
  name: string;
  description?: string; // Wrong for database
}
```

## Testing with Database

### Test Database Setup

```typescript
// tests/setup.ts

import { beforeEach } from "vitest";
import { prisma } from "@/shared/prisma";

beforeEach(async () => {
  // Clean database before each test
  await prisma.message.deleteMany();
  await prisma.session.deleteMany();
  await prisma.workflowRun.deleteMany();
  await prisma.workflowDefinition.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});
```

### Test Fixtures

```typescript
// tests/fixtures/user.fixture.ts

export async function createTestUser(overrides = {}) {
  return await prisma.user.create({
    data: {
      email: "test@example.com",
      name: "Test User",
      ...overrides,
    },
  });
}

export async function createTestProject(userId: string, overrides = {}) {
  return await prisma.project.create({
    data: {
      name: "Test Project",
      path: "/test/path",
      userId,
      ...overrides,
    },
  });
}
```

## Common Issues

### Database Locked

**Error:** `SQLITE_BUSY: database is locked`

**Causes:**
- Multiple node processes accessing database
- Long-running transactions
- Concurrent writes

**Solutions:**
```bash
# Kill all node processes
pkill node

# Restart dev server
pnpm dev

# If persists, delete database and reset
rm apps/app/prisma/dev.db
pnpm prisma:reset
```

### Migration Conflicts

**Error:** Migration conflict after git pull

**Solution:**
```bash
# Reset database and reapply migrations
pnpm prisma migrate reset

# Or manually resolve:
# 1. Check prisma/migrations/ for conflicts
# 2. Resolve manually
# 3. Run: pnpm prisma migrate dev
```

### Client Out of Sync

**Error:** Type errors after schema changes

**Solution:**
```bash
# Regenerate Prisma client
pnpm prisma:generate

# If persists:
rm -rf node_modules
pnpm install
pnpm prisma:generate
```

## Best Practices

### Schema Design

✅ DO:
- Use `cuid()` for IDs
- Include `createdAt` and `updatedAt`
- Use proper relations
- Add indexes for frequent queries
- Document models with `///` comments

❌ DON'T:
- Use auto-increment integers for IDs
- Skip timestamps
- Use Json for data that should be relations
- Forget to add indexes

### Query Optimization

✅ DO:
- Select only needed fields
- Use indexes for filters
- Batch queries with `findMany`
- Use transactions for related operations
- Paginate large result sets

❌ DON'T:
- Select all fields when only need few
- N+1 queries (use include/select)
- Forget pagination
- Mix reads and writes without transactions

### Migrations

✅ DO:
- Test migrations before production
- Use descriptive migration names
- Keep migrations small and focused
- Review generated SQL
- Commit migrations to git

❌ DON'T:
- Edit existing migrations
- Skip migration testing
- Create migrations with data loss
- Force push schema changes

## Quick Reference

**Commands:**
```bash
pnpm prisma:migrate      # Create and apply migration
pnpm prisma:generate     # Regenerate client
pnpm prisma:studio       # Open database GUI
pnpm prisma:reset        # Reset database (dev only)
pnpm prisma migrate deploy  # Apply migrations (production)
```

**File Locations:**
- Schema: `apps/app/prisma/schema.prisma`
- Database: `apps/app/prisma/dev.db`
- Migrations: `apps/app/prisma/migrations/`
- Client: Import from `@/shared/prisma`

**Prisma Studio:**
- GUI for browsing database
- Run: `pnpm prisma:studio`
- Opens: http://localhost:5555

**Related Docs:**
- `.agent/docs/backend-patterns.md` - Domain services with Prisma
- `.agent/docs/testing-best-practices.md` - Testing with database
