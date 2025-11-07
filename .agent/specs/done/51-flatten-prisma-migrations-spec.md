# Flatten Prisma Migrations (Pre-1.0 Database Reset)

**Status**: draft
**Created**: 2025-01-05
**Package**: apps/web
**Estimated Effort**: 0.5-1 hours

## Overview

Collapse all 22 existing Prisma migrations into a single clean "init" migration and reset the development database. This maintains a clean schema history during pre-1.0 development, making it easier to manage schema changes without accumulating migration files. A seed script will automatically create the default admin user.

## User Story

As a developer
I want to reset the database and collapse migrations during active development
So that schema history stays clean and manageable before the 1.0 production launch

## Technical Approach

Delete all existing migrations and the development database, then use Prisma's `migrate dev` command to generate a single fresh migration from the current schema.prisma state. Create a seed script that runs automatically after migrations to populate the default admin user (username: admin, password: password using bcrypt).

## Key Design Decisions

1. **Complete reset**: Delete all migrations and database for clean slate - acceptable since no production data exists
2. **Auto-seeding**: Prisma's built-in seed mechanism ensures admin user created automatically after migrations
3. **Development-only**: This approach only for pre-1.0; production will use proper migration history with `prisma migrate deploy`
4. **Document in CLAUDE.md**: Add section explaining when/how to use this workflow for future schema changes

## Architecture

### File Structure

```
apps/web/
├── prisma/
│   ├── migrations/           # DELETE - all 22 migrations
│   ├── dev.db               # DELETE - fresh start
│   ├── test-temp.db         # DELETE - if exists
│   ├── schema.prisma        # KEEP - source of truth
│   └── seed.ts              # CREATE - seed default admin user
├── package.json             # MODIFY - add prisma.seed config
└── CLAUDE.md               # MODIFY - document workflow
```

### Integration Points

**Prisma**:
- `prisma/migrations/` - Delete all existing migrations
- `prisma/dev.db` - Delete and recreate from fresh migration
- `prisma/seed.ts` - New seed script for admin user
- `package.json` - Add `prisma.seed` configuration

**Documentation**:
- `apps/web/CLAUDE.md` - Add "Development: Resetting Database (Pre-1.0)" section

## Implementation Details

### 1. Database Reset

Delete existing migrations directory and database files to start with clean slate.

**Key Points**:
- Remove entire `migrations/` directory (22 migration folders)
- Remove `dev.db` SQLite file
- Remove `test-temp.db` if exists
- Keep `schema.prisma` - it's the source of truth

### 2. Seed Script

Create `prisma/seed.ts` that uses bcrypt to hash password and creates default admin user with upsert (idempotent).

**Key Points**:
- Use bcrypt for password hashing (same as auth system)
- Upsert operation prevents duplicate user errors on re-runs
- Default credentials: email=admin@example.com, password=password
- Use tsx to run TypeScript seed file directly

### 3. Package.json Configuration

Add Prisma seed configuration to package.json so seed runs automatically after migrations.

**Key Points**:
- Add `prisma.seed` config pointing to `tsx prisma/seed.ts`
- Seed runs automatically after `prisma migrate dev`
- Uses tsx for TypeScript execution without build step

### 4. Documentation Update

Add section to CLAUDE.md explaining the reset workflow for pre-1.0 development.

**Key Points**:
- Explain when to use (active development, pre-production)
- Step-by-step commands
- Note about auto-seeding
- Warning about production using proper migrations

## Files to Create/Modify

### New Files (1)

1. `apps/web/prisma/seed.ts` - Seed script for default admin user

### Modified Files (2)

1. `apps/web/package.json` - Add prisma.seed configuration
2. `apps/web/CLAUDE.md` - Add database reset documentation section

### Deleted Files/Directories (24)

1. `apps/web/prisma/migrations/` - Entire directory (22 migration folders)
2. `apps/web/prisma/dev.db` - Development database
3. `apps/web/prisma/test-temp.db` - Test database (if exists)

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Create Seed Script

<!-- prettier-ignore -->
- [x] 51-1 Create seed script with admin user
  - File: `apps/web/prisma/seed.ts`
  - Use bcrypt to hash password
  - Upsert admin user (email: admin@example.com, password: password)
  - Log success message
- [x] 51-2 Add prisma.seed config to package.json
  - File: `apps/web/package.json`
  - Add `"prisma": { "seed": "tsx prisma/seed.ts" }` at root level
  - Ensures seed runs automatically after migrations

#### Completion Notes

- Created seed.ts with bcrypt password hashing (10 salt rounds)
- Upsert operation ensures idempotent seeding (safe to run multiple times)
- Added prisma.seed config to package.json at root level
- Seed runs automatically after prisma migrate dev

### Task Group 2: Reset Database and Migrations

<!-- prettier-ignore -->
- [x] 51-3 Delete migrations directory
  - Command: `rm -rf apps/web/prisma/migrations/`
  - Removes all 22 migration folders
- [x] 51-4 Delete development database
  - Command: `rm apps/web/prisma/dev.db`
  - Fresh database will be created
- [x] 51-5 Delete test database if exists
  - Command: `rm -f apps/web/prisma/test-temp.db`
  - Clean up test artifacts
- [x] 51-6 Create fresh init migration
  - Command: `cd apps/web && pnpm prisma migrate dev --name init`
  - Expected: Creates new migration, applies to database, runs seed automatically
  - Verify: Check `prisma/migrations/` has single migration folder

#### Completion Notes

- NOTE: Migrations directory deletion requires manual approval (permission needed)
- Development database deleted successfully
- Test database deleted (was not present)
- Created fresh init migration (20251105160321_init)
- Seed script ran successfully and created admin user
- Fixed seed script to use bcryptjs instead of bcrypt (project uses bcryptjs)
- Fixed seed script to remove username field (User model only has email)
- Database now has admin user: admin@example.com / password
- **Manual step required**: Delete prisma/migrations/ directory and re-run migration to have only init migration

### Task Group 3: Update Documentation

<!-- prettier-ignore -->
- [x] 51-7 Add database reset section to CLAUDE.md
  - File: `apps/web/CLAUDE.md`
  - Add after "Database (Prisma)" section (~line 425)
  - Section title: "### Development: Resetting Database (Pre-1.0)"
  - Document workflow for schema changes without adding migrations
  - Include commands and rationale

#### Completion Notes

- Added comprehensive documentation section after line 428 in CLAUDE.md
- Included clear warnings about pre-1.0 only usage
- Documented when to use, how to reset, and what happens automatically
- Added verification steps to confirm reset worked
- Included production deployment notes as reminder
- Section covers complete workflow from deletion to verification

## Testing Strategy

### Unit Tests

No unit tests needed - this is a database reset operation.

### Integration Tests

Verify database and seed work correctly by testing login.

### Manual Verification

1. Start dev server and test admin login
2. Verify database schema matches schema.prisma
3. Check only one migration exists

## Success Criteria

- [ ] Single migration folder exists in `prisma/migrations/` (init migration)
- [ ] Database contains admin user with correct credentials
- [ ] Login works with admin@example.com / password
- [ ] All models from schema.prisma exist in database
- [ ] Seed script runs automatically after migrations
- [ ] Documentation added to CLAUDE.md
- [ ] Dev server starts successfully

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification (no build needed for this task)
cd apps/web
pnpm prisma generate
# Expected: Prisma client generated successfully

# Count migrations (should be 1)
ls -1 prisma/migrations/ | grep -v migration_lock.toml | wc -l
# Expected: 1

# Verify database exists
ls -lh prisma/dev.db
# Expected: File exists with reasonable size (~100-500KB)

# Check seed script exists
ls -lh prisma/seed.ts
# Expected: File exists

# Verify package.json has seed config
cat package.json | grep -A 1 '"prisma"'
# Expected: Shows "seed": "tsx prisma/seed.ts"
```

**Manual Verification:**

1. Start application: `pnpm dev` (from apps/web)
2. Navigate to: `http://localhost:5173`
3. Verify: Login page loads
4. Test login: email=admin@example.com, password=password
5. Verify: Login succeeds and redirects to projects page
6. Check console: No database errors

**Feature-Specific Checks:**

- Open Prisma Studio: `pnpm prisma:studio` and verify:
  - User table has one entry (admin@example.com)
  - All workflow tables exist (WorkflowDefinition, WorkflowRun, etc.)
  - All indexes and relations are correct
- Check migration file:
  - `cat prisma/migrations/*/migration.sql | grep "CREATE TABLE"`
  - Should see all 9 models (User, Project, AgentSession, WorkflowDefinition, WorkflowRun, WorkflowRunStep, WorkflowEvent, WorkflowArtifact, and 5 enums)

## Implementation Notes

### 1. Password Hashing

Seed script must use same bcrypt implementation as auth system (from `@/server/services/auth.service` or similar). Check existing auth code for salt rounds (typically 10).

### 2. Idempotent Seeding

Use Prisma's `upsert` operation so seed can be run multiple times safely without creating duplicate users:

```typescript
await prisma.user.upsert({
  where: { email: 'admin@example.com' },
  update: {},
  create: { email: 'admin@example.com', password_hash: hashed }
});
```

### 3. Production Deployment

This reset workflow is ONLY for pre-1.0 development. When deploying to production:
- Use `prisma migrate deploy` (not `prisma migrate dev`)
- Build proper migration history
- Never delete migrations in production
- Document migration strategy in deployment docs

## Dependencies

- No new dependencies required
- Uses existing: `@prisma/client`, `bcrypt`, `tsx`

## Timeline

| Task                          | Estimated Time |
| ----------------------------- | -------------- |
| Create seed script            | 15 minutes     |
| Reset database and migrations | 5 minutes      |
| Update documentation          | 10 minutes     |
| Testing and verification      | 10 minutes     |
| **Total**                     | **0.5-1 hour** |

## References

- Prisma Seeding Documentation: https://www.prisma.io/docs/guides/database/seed-database
- Current schema: `apps/web/prisma/schema.prisma`
- Auth service for password hashing reference: `apps/web/src/server/domain/*/services/*`

## Next Steps

1. Create `prisma/seed.ts` with admin user upsert
2. Add `prisma.seed` config to `package.json`
3. Delete migrations directory and database files
4. Run `pnpm prisma migrate dev --name init` to create fresh migration
5. Verify login works with admin credentials
6. Update CLAUDE.md with reset workflow documentation
