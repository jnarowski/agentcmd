# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Turborepo monorepo** for agent workflow tools. The `web` app is a full-stack application with a React + Vite frontend and a Fastify backend, designed to manage and visualize AI agent workflows.

## Important Rules

- **Do not add `.js` or `.ts` extensions to file imports** - TypeScript/ESM resolution handles this automatically
- **Always use `@/` path aliases for imports** - Never use relative imports (`../`, `./`)
  - Client imports: `@/client/*` (components, hooks, pages, contexts, etc.)
  - Server imports: `@/server/*` (routes, services, schemas, plugins, etc.)
  - Shared imports: `@/shared/*` (types, utilities, Prisma client)
- **When creating modals, use `BaseDialog`** instead of raw `Dialog` + `DialogContent`

### useEffect Dependency Rules

**Critical**: Incorrect useEffect dependencies cause infinite re-renders, unnecessary API calls, and performance issues.

**Golden Rules:**
1. **Only include primitive values and stable references** in dependency arrays
   - ✅ Good: `[id, userId, isEnabled]` (primitives)
   - ❌ Bad: `[user, project, data]` (object references change every render)

2. **Object/Array dependencies from React Query or props will cause infinite loops**
   - Problem: `const { data: project } = useQuery(...)` creates a new object reference each render
   - ✅ Solution: Extract the primitive you need: `[project?.id]` or use only the ID
   - ✅ Better: Don't depend on the object at all if you only need it for the initial check

3. **Functions from hooks/stores are stable - don't include them**
   - ✅ Zustand store functions: `const handleInvalidToken = useAuthStore(s => s.handleInvalidToken)` (stable)
   - ✅ React Router: `navigate`, `location` from `useNavigate()` (stable)
   - ✅ Use `// eslint-disable-next-line react-hooks/exhaustive-deps` when intentionally omitting stable functions

4. **Common Patterns:**
   ```typescript
   // ❌ BAD - Runs on every render because 'project' object changes
   useEffect(() => {
     if (!id || !project) return;
     doSomething();
   }, [id, project, handleInvalidToken, navigate]);

   // ✅ GOOD - Only runs when ID changes
   useEffect(() => {
     if (!id) return;
     doSomething();
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [id]);
   ```

5. **When in doubt**: Use only primitive values (strings, numbers, booleans) in the dependency array

### Zustand State Management Rules

**Critical**: This project uses Zustand for global state management. Following these principles is essential for proper state updates and re-renders.

**Golden Rules:**

1. **Always Update State Immutably**
   - ❌ **BAD - Mutation**:
     ```typescript
     set((state) => {
       const messages = [...state.messages];
       messages[0].content = "new";  // Mutates object!
       return { messages };
     });
     ```
   - ✅ **GOOD - Immutable**:
     ```typescript
     set((state) => ({
       messages: state.messages.map((msg, i) =>
         i === 0 ? { ...msg, content: "new" } : msg
       ),
     }));
     ```

2. **Return New State from set()**
   - The `set()` function takes a callback that **returns** the new state
   - Zustand merges the returned object with current state
   - Example:
     ```typescript
     set((state) => ({
       count: state.count + 1,  // Returns new state
     }));
     ```

3. **Create New Arrays/Objects for Updates**
   - Spreading arrays: `[...array, newItem]` or `[...array.slice(0, -1), updatedItem]`
   - Spreading objects: `{ ...obj, field: newValue }`
   - Never modify arrays/objects in place

4. **Zustand Store Functions are Stable**
   - Store functions don't change between renders
   - Safe to omit from useEffect dependencies
   - Example:
     ```typescript
     const addMessage = useSessionStore((s) => s.addMessage);

     useEffect(() => {
       // addMessage is stable, don't include in deps
       // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [id]);  // Only include primitives
     ```

5. **Common Patterns:**
   ```typescript
   // ❌ BAD - Mutating nested object
   set((state) => {
     const session = { ...state.currentSession };
     session.messages.push(newMsg);  // Mutation!
     return { currentSession: session };
   });

   // ✅ GOOD - Fully immutable update
   set((state) => ({
     currentSession: state.currentSession
       ? {
           ...state.currentSession,
           messages: [...state.currentSession.messages, newMsg],
         }
       : null,
   }));
   ```

6. **Selector Performance**
   - Use selectors to subscribe to specific state slices
   - Prevents unnecessary re-renders when unrelated state changes
   - Example:
     ```typescript
     // ✅ Only re-renders when messages change
     const messages = useSessionStore((s) => s.currentSession?.messages);

     // ❌ Re-renders on ANY store change
     const store = useSessionStore();
     const messages = store.currentSession?.messages;
     ```

### Null vs Undefined Conventions

**Critical**: Consistent handling of null/undefined prevents type errors and improves code clarity.

**Golden Rules:**

1. **Database Fields (Prisma) - Use `| null`**
   - Prisma uses `null` for nullable database columns
   - Always type as `| null`, never `| undefined` or `| null | undefined`
   - Example:
     ```typescript
     interface WorkflowRun {
       id: string;
       started_at: Date | null;       // ✅ Database field
       completed_at: Date | null;     // ✅ Database field
       error_message: string | null;  // ✅ Database field
     }
     ```

2. **React Props - Use `?` (Optional/Undefined)**
   - React props default to `undefined` when not provided
   - Use optional syntax `?` instead of `| undefined`
   - Example:
     ```typescript
     interface ComponentProps {
       id: string;              // ✅ Required
       name?: string;           // ✅ Optional (undefined when not provided)
       onComplete?: () => void; // ✅ Optional callback
     }
     ```

3. **Never Mix Both**
   - ❌ **BAD**: `value: string | null | undefined`
   - ✅ **GOOD**: `value: string | null` (database field)
   - ✅ **GOOD**: `value?: string` (React prop or optional field)

4. **Type Guards**
   - Check for both `null` and `undefined` when consuming values that could be either
   - Example:
     ```typescript
     // ✅ GOOD - Handles both null and undefined
     if (value == null) {  // == null checks both null and undefined
       return defaultValue;
     }

     // ✅ ALSO GOOD - Explicit null check
     if (value !== null && value !== undefined) {
       return value.toString();
     }

     // ✅ ALSO GOOD - Nullish coalescing
     const displayValue = value ?? 'N/A';
     ```

5. **API Responses**
   - Match Prisma types: use `| null` for nullable fields
   - Example:
     ```typescript
     interface APIResponse {
       data: {
         id: string;
         completed_at: Date | null;  // ✅ Matches Prisma type
       };
     }
     ```

6. **Function Parameters**
   - Use `?` for optional parameters
   - Use `| null` only when `null` has specific meaning
   - Example:
     ```typescript
     // ✅ GOOD - Optional parameter
     function createSession(name: string, metadata?: Record<string, unknown>) {
       // ...
     }

     // ✅ ALSO GOOD - Null has specific meaning (clear value)
     function updateStatus(status: 'active' | 'inactive' | null) {
       // null = clear status, undefined not allowed
     }
     ```

**Summary Table:**

| Context | Convention | Example |
|---------|-----------|---------|
| Prisma database field | `\| null` | `completed_at: Date \| null` |
| React prop | `?` | `name?: string` |
| Optional parameter | `?` | `fn(param?: string)` |
| Nullable API field | `\| null` | `error_message: string \| null` |
| Local variable | Prefer `?` or `\| null` | Depends on context |
| Never use | `\| null \| undefined` | ❌ Always avoid |

### Shared Schemas vs Domain Types (Hybrid Approach)

**Critical**: This project uses a hybrid approach for shared types - validation schemas and enums are shared, but model interfaces remain domain-specific.

**What to Share (Low Coupling Risk):**

- ✅ **Validation schemas** - Zod schemas for request/response validation
- ✅ **Enum types** - Status enums, type enums (WorkflowStatus, StepStatus, etc.)
- ✅ **Request/response schemas** - API contract validation
- Location: `apps/web/src/shared/schemas/`

**What NOT to Share (High Coupling Risk):**

- ❌ **Model interfaces** - WorkflowRun, WorkflowRunStep, etc.
- ❌ **Prisma-generated types** - Backend only
- ❌ **Frontend UI types** - Filters, computed fields, display state
- ❌ **Backend service types** - Service-specific input/output types

**Rationale:**

This hybrid approach provides the benefits of shared validation without the coupling risks of shared model interfaces:

1. **Backend uses Prisma-generated types directly** (111 usages in codebase)
2. **Frontend defines custom interfaces** (12 definitions with UI extensions)
3. **Each layer free to evolve** without affecting the other
4. **Single source of truth** for validation rules and enums

**Type Derivation Pattern (Enums Only):**

Derive enum types from Zod schemas using `z.infer<>`:

```typescript
// ✅ GOOD - Shared enum type derived from schema (apps/web/src/shared/schemas/workflow.schemas.ts)
export const workflowStatusSchema = z.enum(['pending', 'running', 'paused', 'completed', 'failed', 'cancelled']);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

// ✅ GOOD - Frontend uses shared enum in custom interface (apps/web/src/client/pages/projects/workflows/types.ts)
import type { WorkflowStatus } from '@/shared/schemas';

export interface WorkflowRun {
  id: string;
  status: WorkflowStatus; // ← Uses shared enum
  // ... other fields frontend needs (custom)
}

// ✅ GOOD - Backend uses Prisma types + shared enums for validation
import { workflowExecutionResponseSchema } from '@/shared/schemas';
import { prisma } from '@/shared/prisma';

const execution = await prisma.workflowExecution.findUnique({ where: { id } });
// Prisma types are used for database operations, schemas validate API responses

// ❌ BAD - Don't derive full model interfaces from schemas
export interface WorkflowRun extends z.infer<typeof workflowExecutionResponseSchema> {
  // This couples frontend to backend response shape
}
```

**Import Patterns:**

```typescript
// ✅ Backend routes - Import schemas for validation
import { createWorkflowRunSchema, workflowExecutionFiltersSchema } from '@/shared/schemas';

// ✅ Frontend types - Import only enum types
import type { WorkflowStatus, StepStatus } from '@/shared/schemas';

// ✅ Backend services - Use Prisma types directly
import { prisma } from '@/shared/prisma';
// No manual interfaces needed - Prisma generates types

// ❌ Don't import full response schemas in frontend (unless validating)
import { workflowExecutionResponseSchema } from '@/shared/schemas'; // Only if validating API response
```

**Value vs Confusion Matrix:**

| Shared Item | Value | Confusion Risk | Verdict |
|------------|-------|----------------|---------|
| Validation schemas | ✅ High | ⚠️ Low | **Share** |
| Enum types | ✅ High | ⚠️ Low | **Share** |
| Model interfaces | ⚠️ Medium | ❌ High | **Keep separate** |
| Prisma types | ⚠️ Low | ❌ Very High | **Backend only** |
| UI types | ⚠️ Low | ❌ Very High | **Frontend only** |

**Key Benefits:**

1. ✅ Single source of truth for validation rules
2. ✅ Client-side validation matches server-side
3. ✅ Enum types prevent drift between layers
4. ✅ No coupling between layers
5. ✅ Each layer free to add fields without breaking the other
6. ✅ Backend continues using Prisma-generated types (no manual interfaces)
7. ✅ Frontend defines interfaces with UI needs (optional relations, computed fields)

**Domain Schema Organization:**

Following the domain-driven architecture, validation schemas are organized by domain:

```
apps/web/src/
├── shared/schemas/           # Cross-cutting validation schemas
│   └── workflow.schemas.ts   # Used by both frontend and backend
│
└── server/domain/
    ├── session/schemas/      # Session-specific validation
    ├── git/schemas/          # Git operation validation
    ├── project/schemas/      # Project CRUD validation
    ├── shell/schemas/        # Shell WebSocket message validation
    └── file/schemas/         # File operations (currently no schemas needed)
```

**Import Guidelines:**

```typescript
// ✅ Import cross-cutting schemas from shared/
import { WorkflowStatus, workflowEventTypeSchema } from '@/shared/schemas';

// ✅ Import domain schemas from domain folder
import { createSessionSchema } from '@/server/domain/session/schemas';
import * as gitSchemas from '@/server/domain/git/schemas';

// ❌ Don't import from legacy server/schemas/ (deprecated)
import { createSessionSchema } from '@/server/schemas/session'; // Legacy location
```

**Migration Status:**

- ✅ Workflow schemas → `shared/schemas/` (cross-cutting)
- ✅ Session schemas → `server/domain/session/schemas/`
- ✅ Git schemas → `server/domain/git/schemas/`
- ✅ Shell schemas → `server/domain/shell/schemas/`
- ✅ Project schemas → `server/domain/project/schemas/`
- ⚠️ Legacy `server/schemas/` marked as deprecated (will be removed)

## Development Commands

### Starting the Application

```bash
# Development mode (runs both client and server concurrently)
# Note: Automatically runs 'prisma migrate deploy' to apply any pending migrations
pnpm dev

# Development server only (Fastify backend on port 3456)
pnpm dev:server

# Development client only (Vite dev server on port 5173)
pnpm dev:client

# Production mode
pnpm start
```

### Building

```bash
# Build both client and server
pnpm build

# Build from monorepo root (builds all packages)
cd ../.. && pnpm build
```

### Code Quality

```bash
# Lint code
pnpm lint

# Type checking
pnpm check-types  # From monorepo root

# Format code
pnpm format  # From monorepo root
```

### Database (Prisma)

```bash
# Generate Prisma client
pnpm prisma:generate

# Create and apply migrations (development only)
pnpm prisma:migrate  # = prisma migrate dev

# Apply existing migrations (auto-runs with 'pnpm dev')
prisma migrate deploy

# Reset database and flatten migrations (pre-1.0 only)
pnpm prisma:reset

# Run seed script manually
pnpm prisma:seed

# Open Prisma Studio
pnpm prisma:studio
```

Database file: `prisma/dev.db` (SQLite)

**Note**: Migrations are automatically applied when running `pnpm dev`, so you typically only need to run `pnpm prisma:migrate` when you've changed the schema.

### Development: Resetting Database (Pre-1.0)

During active pre-1.0 development, you can reset the database and collapse migrations for a clean slate. This is useful when accumulating too many migration files or when you want to simplify schema history.

**⚠️ WARNING**: This workflow is ONLY for pre-1.0 development. Never use this in production or after v1.0 launch.

**When to use:**
- Active schema iteration during development
- Too many migration files accumulated (>20)
- Want to simplify migration history before 1.0
- No production data to preserve

**How to reset:**

```bash
cd apps/web

# Option 1: Use convenient npm script (recommended)
pnpm prisma:reset

# Option 2: Manual commands
rm -rf prisma/migrations/
rm -f prisma/dev.db
rm -f prisma/test-temp.db
pnpm prisma generate
pnpm prisma migrate dev --name init

# Expected output:
# - Creates single migration folder: migrations/YYYYMMDDHHMMSS_init/
# - Applies migration to fresh database
# - Runs seed script automatically (creates admin user)
# - Admin credentials: admin@example.com / password
```

**What happens automatically:**
- New SQLite database created at `prisma/dev.db`
- Single migration created from current `schema.prisma`
- Seed script runs and creates default admin user
- Admin user: email=`admin@example.com`, password=`password`

**Verify reset worked:**

```bash
# Check only one migration exists
ls -1 prisma/migrations/ | grep -v migration_lock.toml | wc -l
# Should output: 1

# Verify database and admin user exist
pnpm prisma:studio
# Open Users table, should see one admin user

# Test login
pnpm dev
# Navigate to http://localhost:5173 and login with admin@example.com / password
```

**Production Deployment:**

When deploying to production (v1.0+):
- Use `prisma migrate deploy` (NOT `prisma migrate dev`)
- Never delete migrations
- Build proper migration history for rollback capability
- Use proper seed data (not hardcoded admin user)

## Architecture

### Monorepo Structure

```
apps/
  web/              # This app - full-stack workflow UI
  claudecodeui/     # Separate UI app
packages/
  workflow-sdk/  # Core workflow utilities (agentcmd-workflows)
  agent-cli-sdk/    # CLI SDK for AI tools (@repo/agent-cli-sdk)
  ui/               # Shared UI components
  eslint-config/    # Shared ESLint configuration
  typescript-config/# Shared TypeScript configuration
```

### Backend Architecture

The backend follows a **domain-driven functional architecture** that prioritizes:
- Business logic organized by domain (not technical layer)
- Pure functions over classes
- Thin transport layer (routes, WebSocket)
- Centralized configuration

#### Domain Directory Structure

```
src/server/
├── domain/                     # All business logic lives here
│   ├── project/               # Project management domain
│   │   ├── services/          # Business logic (one function per file)
│   │   │   ├── getProjectById.ts
│   │   │   ├── getAllProjects.ts
│   │   │   ├── createProject.ts
│   │   │   ├── updateProject.ts
│   │   │   ├── deleteProject.ts
│   │   │   └── index.ts       # Barrel export
│   │   ├── schemas/           # Zod validation schemas
│   │   │   └── index.ts
│   │   └── types/             # Domain-specific types
│   │       └── index.ts
│   │
│   ├── session/               # Agent session domain
│   │   ├── services/
│   │   │   ├── createSession.ts
│   │   │   ├── getSessionsByProject.ts
│   │   │   ├── executeAgent.ts
│   │   │   ├── updateSessionMetadata.ts
│   │   │   └── index.ts
│   │   ├── schemas/
│   │   └── types/
│   │
│   ├── file/                  # File operations domain
│   │   ├── services/
│   │   │   ├── getFileTree.ts
│   │   │   ├── readFile.ts
│   │   │   ├── writeFile.ts
│   │   │   └── index.ts
│   │   ├── schemas/
│   │   └── types/
│   │
│   ├── git/                   # Git operations domain
│   │   ├── services/
│   │   │   ├── getGitStatus.ts
│   │   │   ├── createCommit.ts
│   │   │   ├── getBranches.ts
│   │   │   └── index.ts
│   │   ├── schemas/
│   │   └── types/
│   │
│   └── shell/                 # Shell/terminal domain
│       ├── services/
│       │   ├── createShellSession.ts
│       │   ├── destroyShellSession.ts
│       │   ├── writeToShell.ts
│       │   └── index.ts
│       ├── schemas/
│       └── types/
│
├── routes/                    # Thin HTTP route handlers
│   ├── auth.ts               # Authentication endpoints
│   ├── projects.ts           # Project CRUD
│   ├── sessions.ts           # Session management
│   ├── files.ts              # File operations
│   ├── git.ts                # Git operations
│   └── index.ts              # Route registration
│
├── websocket.ts              # WebSocket transport (thin orchestrator)
├── config.ts                 # Centralized configuration
├── plugins/                  # Fastify plugins
│   └── auth.ts              # JWT authentication
├── utils/                    # Shared server utilities
└── index.ts                  # Server entry point
```

#### Key Architectural Principles

**1. One Function Per File in domain/*/services/**

Each service file exports exactly ONE function, and the file name matches the function name:

```typescript
// ✅ domain/project/services/getProjectById.ts
export async function getProjectById(id: string): Promise<Project | null> {
  // Function logic
}

// ✅ domain/session/services/createSession.ts
export async function createSession(
  projectId: string,
  userId: string,
  agent: string
): Promise<AgentSession> {
  // Function logic
}
```

**2. Pure Functions - No Classes**

All domain services are pure functions that receive dependencies explicitly:

```typescript
// ✅ GOOD - Pure function with explicit parameters
export async function readFile(
  projectId: string,
  filePath: string,
  logger?: FastifyBaseLogger
): Promise<string> {
  const project = await getProjectById(projectId);
  // ... implementation
}

// ❌ BAD - Class-based service with hidden state
class FileService {
  constructor(private logger: Logger) {}
  async readFile(projectId: string, filePath: string) { ... }
}
```

**3. Routes Are Thin Orchestrators**

Route handlers delegate all business logic to domain services:

```typescript
// ✅ GOOD - Thin route handler
fastify.get('/api/projects/:id', async (request, reply) => {
  const { id } = request.params;
  const userId = request.user!.id;

  // Delegate to domain service
  const project = await getProjectById(id);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  return reply.send(buildSuccessResponse(project));
});

// ❌ BAD - Business logic in route handler
fastify.get('/api/projects/:id', async (request, reply) => {
  const project = await prisma.project.findUnique(...);
  const currentBranch = await getCurrentBranch(...);
  const transformed = {
    id: project.id,
    // ... manual transformation
  };
  return reply.send({ data: transformed });
});
```

**4. WebSocket as Thin Transport Layer**

WebSocket handlers orchestrate domain functions but contain no business logic:

```typescript
// ✅ GOOD - Thin WebSocket handler
socket.on('message', async (rawMessage) => {
  const message = JSON.parse(rawMessage.toString()) as WebSocketMessage;

  if (message.type === 'session.send_message') {
    // Orchestrate domain services
    const session = await getSessionById(message.data.sessionId);
    const result = await executeAgent({
      sessionId: session.id,
      message: message.data.message,
      onStream: (chunk) => sendToClient(socket, chunk)
    });

    sendToClient(socket, 'session.message_complete', result);
  }
});

// ❌ BAD - Business logic in WebSocket handler
socket.on('message', async (rawMessage) => {
  const message = JSON.parse(rawMessage.toString());
  // Directly spawning processes, parsing outputs, etc.
  const process = spawn('claude', [...]);
  // 50+ lines of logic here
});
```

**5. Centralized Configuration**

All environment variables accessed through `config.ts`:

```typescript
// config.ts
export const config = {
  port: Number(process.env.PORT) || 3456,
  jwtSecret: process.env.JWT_SECRET!,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  // ...
};

// ✅ GOOD - Import from config
import { config } from '@/server/config.js';
const port = config.port;

// ❌ BAD - Direct process.env access
const port = process.env.PORT || 3456;
```

**6. Import Patterns**

Always import from domain services, never from old services/ directory:

```typescript
// ✅ GOOD - Import from domain
import { getProjectById } from '@/server/domain/project/services/getProjectById.js';
import { readFile } from '@/server/domain/file/services/readFile.js';
import { createSession } from '@/server/domain/session/services/createSession.js';

// ❌ BAD - Don't import from old services/ directory
import { getProjectById } from '@/server/services/project.service.js';

// ✅ ALSO GOOD - Import from barrel export
import { getProjectById, getAllProjects } from '@/server/domain/project/services/index.js';
```

**7. Error Handling**

Domain functions return `null` for "not found" cases; routes decide HTTP status:

```typescript
// Domain service
export async function getProjectById(id: string): Promise<Project | null> {
  const project = await prisma.project.findUnique({ where: { id } });
  return project || null;  // Return null, not throw
}

// Route handler decides status code
const project = await getProjectById(id);
if (!project) {
  throw new NotFoundError('Project not found');  // 404
}
```

#### Domain Organization Benefits

1. **Discoverability**: Find all project-related logic in `domain/project/`
2. **Maintainability**: Each function in its own file, easy to locate and update
3. **Testability**: Pure functions are easy to unit test
4. **Scalability**: Add new domains without affecting existing ones
5. **Team collaboration**: Multiple developers can work on different domains without conflicts
6. **Clear boundaries**: Domain logic separated from transport concerns

#### Adding New Domain Functions

When adding new business logic:

1. **Identify the domain**: project, session, file, git, shell, or create new domain
2. **Create function file**: `domain/{domain}/services/{functionName}.ts`
3. **Write pure function**: Accept parameters explicitly, return Promise
4. **Export from barrel**: Add to `domain/{domain}/services/index.ts`
5. **Create route handler**: Import and call domain function
6. **Add tests**: Co-locate test file: `{functionName}.test.ts`

#### Testing Domain Functions

Domain functions should have unit tests co-located with the source:

```
domain/project/services/
├── getProjectById.ts
├── getProjectById.test.ts      # Unit test
├── createProject.ts
├── createProject.test.ts       # Unit test
└── index.ts
```

Test template:

```typescript
// getProjectById.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getProjectById } from './getProjectById.js';

describe('getProjectById', () => {
  it('should return project when found', async () => {
    // Arrange
    const projectId = 'test-id';

    // Act
    const result = await getProjectById(projectId);

    // Assert
    expect(result).toBeDefined();
    expect(result?.id).toBe(projectId);
  });

  it('should return null when not found', async () => {
    const result = await getProjectById('non-existent');
    expect(result).toBeNull();
  });
});
```

### Web App Structure

```
src/
  client/           # React frontend (Vite root)
    components/     # Shared React components
      ui/           # shadcn/ui components (Radix UI + Tailwind)
      ai-elements/  # AI chat interface components (Conversation, Message, etc.)
    pages/          # Route pages organized by feature
      auth/         # Authentication pages and components
      projects/     # Projects feature with nested features
        components/ # Project-level components (dialogs)
        hooks/      # Project-level hooks (useProjects)
        sessions/   # Session feature (chat, agents)
        files/      # Files feature (file tree, editor)
        shell/      # Shell feature (terminal)
    layouts/        # Layout components (ProtectedLayout, AuthLayout)
    contexts/       # React contexts (AuthContext)
    hooks/          # Shared custom React hooks
    lib/            # Client utilities
  server/           # Fastify backend
    routes/         # API route handlers (auth, projects, shell)
    plugins/        # Fastify plugins (auth/JWT)
    schemas/        # Zod validation schemas
    services/       # Business logic services (ShellService, etc.)
    websocket.ts    # WebSocket handler
    index.ts        # Server entry point
  shared/           # Code shared between client and server
    types/          # Shared TypeScript types
    prisma.ts       # Prisma client singleton
```

### Frontend File Organization

The frontend follows a **feature-based architecture** where code is organized by feature proximity rather than file type. This improves maintainability and makes it easier to locate related files.

**Naming Conventions:**
- **PascalCase** for all non-UI components and React components (`LoginForm.tsx`, `AppSidebar.tsx`)
- **kebab-case** only for shadcn/ui components in `components/ui/` (e.g., `dropdown-menu.tsx`)
- **PascalCase** for hooks, stores, utilities, and lib files when they are feature-specific

**Organization Principles:**

1. **Top-Level Shared Code** (`client/components/`, `client/hooks/`, `client/lib/`)
   - Only truly shared, reusable components
   - Examples: `AppSidebar.tsx`, `NavUser.tsx`, `ThemeToggle.tsx`
   - Shared hooks used across multiple features
   - General utilities used application-wide

2. **Feature-Based Organization** (`client/pages/{feature}/`)
   - Each major feature gets its own directory under `pages/`
   - Features contain all related code: pages, components, hooks, stores, lib, utils
   - Subdirectories within features:
     - `components/` - Feature-specific UI components
     - `hooks/` - Feature-specific React hooks
     - `stores/` - Feature-specific Zustand stores
     - `lib/` - Feature-specific business logic
     - `utils/` - Feature-specific utility functions
     - `contexts/` - Feature-specific React contexts
   - Page components live at the feature root (e.g., `pages/projects/sessions/ProjectSession.tsx`)

3. **Current Feature Structure:**
   ```
   pages/
   ├── auth/                    # Authentication feature
   │   ├── components/          # LoginForm, SignupForm
   │   ├── Login.tsx            # Login page
   │   └── Signup.tsx           # Signup page
   │
   └── projects/                # Projects feature
       ├── components/          # ProjectDialog, DeleteProjectDialog
       ├── hooks/               # useProjects hook
       │
       ├── sessions/            # Session sub-feature (chat/agents)
       │   ├── stores/          # sessionStore
       │   ├── lib/             # slashCommandUtils
       │   ├── components/      # Chat components, session renderers
       │   ├── hooks/           # useAgentSessions, useSessionWebSocket, useSlashCommands
       │   ├── utils/           # parseClaudeSession, sessionAdapters
       │   └── ProjectSession.tsx
       │
       ├── files/               # Files sub-feature
       │   ├── stores/          # filesStore
       │   ├── lib/             # fileUtils
       │   ├── components/      # FileTree, FileEditor, ImageViewer
       │   ├── hooks/           # useFiles
       │   └── ProjectFiles.tsx
       │
       └── shell/               # Shell sub-feature (terminal)
           ├── contexts/        # ShellContext
           ├── components/      # Terminal, ShellControls
           ├── hooks/           # useShellWebSocket, useTerminalSession
           └── ProjectShell.tsx
   ```

**When to Use Each Location:**

- **`components/`** (top-level): Shared across 3+ features or used in layouts
- **`pages/{feature}/components/`**: Only used within that feature
- **`hooks/`** (top-level): Shared hooks like `useAuth`, `useNavigation`
- **`pages/{feature}/hooks/`**: Feature-specific hooks
- **`stores/`** (top-level): Only global stores like `authStore`, `navigationStore`
- **`pages/{feature}/stores/`**: Feature-specific state management

**Import Patterns:**

Always use the `@/client/` alias for imports:

```typescript
// ✅ Top-level shared components
import { AppSidebar } from "@/client/components/AppSidebar";

// ✅ Feature-specific components
import { LoginForm } from "@/client/pages/auth/components/LoginForm";
import { FileTree } from "@/client/pages/projects/files/components/FileTree";

// ✅ Feature-specific hooks
import { useProjects } from "@/client/pages/projects/hooks/useProjects";
import { useFiles } from "@/client/pages/projects/files/hooks/useFiles";

// ✅ Feature-specific stores
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";

// ✅ Relative imports within the same feature subdirectory
// In pages/projects/sessions/components/ChatInterface.tsx:
import { useSessionStore } from "../stores/sessionStore";
import { ChatPromptInput } from "./ChatPromptInput";
```

**Benefits of This Organization:**

1. **Feature Isolation**: Easy to find all code related to a feature
2. **Clear Dependencies**: See what's shared vs feature-specific
3. **Easier Refactoring**: Move or delete features without breaking unrelated code
4. **Better Onboarding**: New developers can navigate by feature, not file type
5. **Scalability**: Add new features without cluttering top-level directories

### Technology Stack

**Frontend:**
- React 19 with TypeScript
- Vite for development and bundling
- React Router for routing
- TanStack Query (React Query) for server state
- Tailwind CSS v4 + shadcn/ui (Radix UI components)
- Zod for validation

**Backend:**
- Fastify (HTTP server)
- Fastify WebSocket support
- JWT authentication (@fastify/jwt)
- Prisma ORM with SQLite
- bcrypt for password hashing
- node-pty for terminal/shell sessions

**Build System:**
- Turborepo for monorepo orchestration
- pnpm for package management
- tsx for running TypeScript directly

### Key Architectural Patterns

1. **Client-Server Split**: Frontend (Vite dev server on `:5173`) proxies API requests to backend (Fastify on `:3456`) during development

2. **Authentication Flow**:
   - JWT tokens issued by `/api/auth/login` endpoint
   - Protected routes use `authPlugin` to verify JWT
   - Client stores token in `AuthContext` and includes in API requests

3. **Database Models** (Prisma):
   - `User` - User authentication
   - `Project` - Project management
   - `Workflow` - Workflow run tracking
   - `WorkflowStep` - Individual workflow steps

4. **API Routes**:
   - `/api/auth/*` - Authentication endpoints (login, signup)
   - `/api/projects/*` - Project CRUD operations
   - `/api/workflows` - Workflow data (currently mock data)
   - `/ws` - WebSocket endpoint for real-time updates
   - `/shell` - WebSocket endpoint for terminal/shell sessions (JWT authenticated via query param)

5. **Import Aliases**:
   - `@/*` resolves to `src/*` (used across client, server, and shared code)
   - Client code: Use `@/client/*` for all client modules
   - Server code: Use `@/server/*` for all server modules
   - Shared code: Use `@/shared/*` for types, utilities, and Prisma client
   - **Never use relative imports** (`../`, `./`) - always use the `@/` alias

6. **Tool Result Matching Pattern**:
   - All interactive tools (Read, AskUserQuestion, Bash, etc.) follow a standardized pattern
   - Tool results are matched to tool invocations via `tool_use_id` during message enrichment
   - Results are nested into `tool_use` blocks automatically (happens once when loading messages)
   - Components receive enriched data as props - no manual `tool_use_id` lookups required
   - Images are auto-parsed to `UnifiedImageBlock` objects, other content stays as strings
   - For complete details, see: `.agent/docs/claude-tool-result-patterns.md`

7. **Production Mode**: Built client assets are served from `dist/client/` by Fastify with SPA fallback

## Workspace Dependencies

The web app depends on workspace packages:
- `@repo/agent-cli-sdk` - SDK for orchestrating AI CLI tools
- `agentcmd-workflows` - Agent workflow utilities

Use `workspace:*` protocol in package.json for workspace dependencies.

## Running Tests

Currently no test scripts configured in the web app. Tests are configured at the package level for workspace packages.

## Environment Variables

**Required:**
- `JWT_SECRET` - Secret key for signing JWT tokens (generate with `openssl rand -base64 32`)

**Optional (with defaults):**
- `PORT` - Backend server port (default: 3456)
- `VITE_PORT` - Vite dev server port (default: 5173)
- `HOST` - Server host (default: 127.0.0.1)
- `LOG_LEVEL` - Logging level: trace, debug, info, warn, error, fatal (default: info)
- `ALLOWED_ORIGINS` - Comma-separated CORS origins (default: http://localhost:5173)
- `NODE_ENV` - Node environment (default: development)

See `.env.example` for complete configuration template.

## Common Gotchas

1. **Server restarts**: Changes to server code require manual restart unless using `tsx watch` (which `pnpm dev:server` uses)

2. **Prisma schema changes**: Run `pnpm prisma:generate` after modifying `schema.prisma`

3. **Path aliases**: Always use `@/` aliases for imports across all code:
   - `@/client/*` in client code
   - `@/server/*` in server code
   - `@/shared/*` in both client and server
   - This applies to both Vite bundling (client) and tsx execution (server)

4. **Empty JSON bodies**: Server is configured to handle empty JSON bodies (e.g., DELETE with Content-Type: application/json)

5. **Development workflow**: Use `pnpm dev` from the web app directory to run both client and server together

6. **WebSocket authentication**: The `/shell` endpoint requires JWT authentication passed as a query parameter (`?token=...`) since browser WebSocket API doesn't support custom headers

7. **AI Elements components**: The `ai-elements/` directory contains reusable chat UI components (Conversation, Message, PromptInput, etc.) for building AI chat interfaces

## Debugging & Troubleshooting

### Server Logs

**Primary Log Location:** `apps/web/logs/app.log`

The server outputs structured JSON logs to this file. Check this file anytime to see the latest server output, errors, and debugging information.

**Log Configuration:**
- **Development Mode**: Pretty-printed colored output to console + JSON to file
- **Production Mode**: JSON output to both console and file
- **Log Level**: Controlled by `LOG_LEVEL` environment variable (default: `info`)
  - Options: `trace`, `debug`, `info`, `warn`, `error`, `fatal`
  - Set `LOG_LEVEL=debug` for more detailed output during development
  - Set `LOG_LEVEL=trace` for maximum verbosity (includes all requests/responses)

**Useful Debugging Commands:**

```bash
# Watch logs in real-time
tail -f apps/web/logs/app.log

# Watch logs with pretty formatting (requires jq)
tail -f apps/web/logs/app.log | jq .

# Filter for errors only
tail -f apps/web/logs/app.log | jq 'select(.level >= 50)'

# Search for specific session/project activity
grep "sessionId" apps/web/logs/app.log | jq .
grep "projectId" apps/web/logs/app.log | jq .

# Clear logs and start fresh
> apps/web/logs/app.log
```

### Common Issues & Solutions

#### 1. **WebSocket Connection Failures**

**Symptoms:**
- Chat interface shows "Connecting..." indefinitely
- Shell terminal won't connect
- Browser console shows WebSocket errors

**Debug Steps:**
```bash
# 1. Check server logs
tail -f apps/web/logs/app.log | grep -i "websocket"

# 2. Verify server is running
curl http://localhost:3456/api/health

# 3. Check WebSocket endpoint directly
# For chat: ws://localhost:3456/ws
# For shell: ws://localhost:3456/shell

# 4. Verify JWT token is valid
# Check browser DevTools > Application > Local Storage > authToken
```

**Common Fixes:**
- Restart both client and server: `pnpm dev:kill && pnpm dev`
- Clear browser local storage and re-login
- Check `ALLOWED_ORIGINS` environment variable includes your dev server URL
- Verify firewall/network settings aren't blocking WebSocket connections

#### 2. **Database Locked Errors**

**Symptoms:**
- "database is locked" errors in logs
- Failed transactions
- Slow queries

**Debug Steps:**
```bash
# Check for zombie processes holding DB connections
lsof | grep dev.db

# Open Prisma Studio to verify DB state
pnpm prisma:studio
```

**Common Fixes:**
```bash
# Kill all node processes (nuclear option)
killall node

# Restart application
pnpm dev:kill && pnpm dev

# If corruption suspected, reset database
rm prisma/dev.db
pnpm prisma:migrate
```

#### 3. **Agent Session Not Streaming**

**Symptoms:**
- Messages sent but no response
- Agent appears stuck "thinking"
- No streaming output in chat

**Debug Steps:**
```bash
# 1. Check for active sessions in logs
tail -f apps/web/logs/app.log | grep "activeSessions"

# 2. Verify Claude CLI is accessible
which claude
claude --version

# 3. Check session websocket events
# Look for "session.{id}.send_message" and "session.{id}.stream_output" in logs

# 4. Verify temp image directory is writable
ls -la /tmp/agentcmd-*
```

**Common Fixes:**
- Verify Claude CLI is installed: `curl -fsSL https://claude.ai/install.sh | sh`
- Check `sessionStore` state in React DevTools
- Verify project path is valid and accessible
- Check for syntax errors in slash commands
- Review WebSocket message payloads in browser DevTools > Network > WS

#### 4. **File Editor Not Loading/Saving**

**Symptoms:**
- File content doesn't display
- Save operations fail silently
- File tree shows wrong structure

**Debug Steps:**
```bash
# 1. Check file permissions
ls -la /path/to/project

# 2. Verify API responses
# Browser DevTools > Network > filter for /api/projects/:id/files

# 3. Check server logs for file operations
tail -f apps/web/logs/app.log | grep -i "file"

# 4. Verify project path is correct
# Query database directly
pnpm prisma:studio
# Or via SQLite CLI
sqlite3 prisma/dev.db "SELECT id, name, path FROM Project;"
```

**Common Fixes:**
- Ensure project path doesn't contain special characters or spaces
- Verify user has read/write permissions to project directory
- Check that files aren't binary (CodeMirror only supports text files)
- Clear TanStack Query cache: React DevTools > Components > QueryClientProvider

#### 5. **Authentication Issues**

**Symptoms:**
- Redirected to login repeatedly
- 401 Unauthorized errors
- "Invalid token" messages

**Debug Steps:**
```bash
# 1. Verify JWT_SECRET is set
echo $JWT_SECRET

# 2. Check token in browser
# DevTools > Application > Local Storage > authToken

# 3. Test authentication endpoint
curl -X POST http://localhost:3456/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# 4. Check server logs for auth errors
tail -f apps/web/logs/app.log | grep -i "auth\|jwt"
```

**Common Fixes:**
```bash
# Regenerate JWT secret
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# Restart server with new secret
pnpm dev:kill && pnpm dev

# Clear browser storage and re-login
# DevTools > Application > Local Storage > Clear All
```

#### 6. **TypeScript Errors After Updates**

**Symptoms:**
- Type errors in editor
- Build failures
- "Cannot find module" errors

**Debug Steps:**
```bash
# 1. Verify dependencies are installed
pnpm install

# 2. Regenerate Prisma client
pnpm prisma:generate

# 3. Check TypeScript version
pnpm list typescript

# 4. Verify path aliases in tsconfig
cat tsconfig.json | grep "paths"
```

**Common Fixes:**
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Regenerate types
pnpm prisma:generate

# Restart TypeScript server in VS Code
# Command Palette > TypeScript: Restart TS Server

# Type-check all code
pnpm check-types
```

### Performance Debugging

#### Client Performance

**React DevTools Profiler:**
1. Install React DevTools browser extension
2. Open DevTools > Profiler tab
3. Click "Record" and perform actions
4. Look for slow renders or unnecessary re-renders

**Common Performance Issues:**
- **Unnecessary re-renders**: Check useEffect dependencies (see useEffect rules above)
- **Large file tree rendering**: Consider virtualization with `react-window`
- **CodeMirror lag**: Limit file size (current max: ~10MB)
- **WebSocket message spam**: Check event filtering in `WebSocketEventBus`

**TanStack Query Debugging:**
```typescript
// Enable React Query Devtools (already included in dev)
// Access via floating icon in bottom-right corner

// Check query cache state
import { useQueryClient } from '@tanstack/react-query';
const queryClient = useQueryClient();
console.log(queryClient.getQueryCache().getAll());
```

#### Server Performance

**Enable Query Logging:**
```typescript
// In src/shared/prisma.ts (already enabled in development)
// Shows all SQL queries with duration and params
```

**Profile Slow Endpoints:**
```bash
# Add timing logs to routes
fastify.log.info({ duration: Date.now() - start }, 'Request completed');

# Use Fastify hooks for automatic timing
fastify.addHook('onRequest', async (request) => {
  request.startTime = Date.now();
});

fastify.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime;
  fastify.log.info({ path: request.url, method: request.method, duration });
});
```

**Monitor WebSocket Memory:**
```bash
# Check active sessions count
# Look for "activeSessions size:" in logs

# Monitor Node.js memory usage
node --expose-gc --inspect src/server/index.ts
# Then use Chrome DevTools: chrome://inspect
```

### Testing & Validation

**Manual API Testing:**

```bash
# Health check
curl http://localhost:3456/api/health

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3456/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' | jq -r '.data.token')

# Get projects (authenticated)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3456/api/projects | jq .

# Get project files
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3456/api/projects/PROJECT_ID/files?path=src" | jq .

# Git status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3456/api/git/status?projectId=PROJECT_ID" | jq .
```

**Test WebSocket Connections:**

Use a WebSocket testing tool like `wscat`:
```bash
# Install wscat
npm install -g wscat

# Connect to chat WebSocket (requires token)
wscat -c "ws://localhost:3456/ws?token=YOUR_JWT_TOKEN"

# Send test message
{"type":"session.test-id.send_message","data":{"message":"Hello"}}

# Connect to shell WebSocket
wscat -c "ws://localhost:3456/shell?token=YOUR_JWT_TOKEN"

# Send shell init
{"type":"shell.test-id.init","data":{"projectId":"PROJECT_ID"}}
```

### Logging Best Practices

**When Adding New Logs:**

```typescript
// ✅ GOOD - Structured logging with context
fastify.log.info({
  userId,
  projectId,
  sessionId,
  duration: Date.now() - start
}, 'Session created successfully');

// ✅ GOOD - Error logging with error object
fastify.log.error({
  err: error,
  userId,
  operation: 'createProject'
}, 'Failed to create project');

// ✅ GOOD - Debug logging for development
fastify.log.debug({
  eventType,
  messageId,
  contentLength: content.length
}, 'Processing WebSocket message');

// ❌ BAD - String concatenation
fastify.log.info('User ' + userId + ' created project ' + projectId);

// ❌ BAD - No context
fastify.log.error('Error occurred');

// ❌ BAD - Logging sensitive data
fastify.log.info({ password, token }, 'Login attempt'); // NEVER LOG SECRETS!
```

**Log Levels Guide:**
- **trace**: Very detailed, every step (e.g., function entry/exit)
- **debug**: Development debugging (e.g., variable values, flow control)
- **info**: Normal operations (e.g., session created, file saved) ← Default
- **warn**: Unexpected but handled (e.g., file not found, retry attempt)
- **error**: Operation failed (e.g., database error, validation failed)
- **fatal**: Application crash (e.g., can't connect to database)

## Best Practices & Conventions

### Service Layer Patterns

**Functional Services (No Classes):**

All business logic lives in service files as **pure functions** that accept parameters explicitly.

```typescript
// ✅ GOOD - Pure function with explicit parameters
export async function getProjectById(
  id: string,
  logger?: FastifyBaseLogger
): Promise<Project | null> {
  logger?.debug({ projectId: id }, 'Fetching project');

  try {
    return await prisma.project.findUnique({ where: { id } });
  } catch (error) {
    logger?.error({ err: error, projectId: id }, 'Failed to fetch project');
    throw error;
  }
}

// ❌ BAD - Class-based service
class ProjectService {
  constructor(private logger: Logger) {}
  async getById(id: string) { ... }
}
```

**Service Error Handling:**

Services should return `null` for "not found" cases and let routes decide the HTTP response.

```typescript
// ✅ GOOD - Return null, let route handle 404
export async function getProjectById(id: string): Promise<Project | null> {
  try {
    return await prisma.project.findUnique({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return null; // Not found
    }
    throw error; // Re-throw unexpected errors
  }
}

// Route decides HTTP response
const project = await getProjectById(id);
if (!project) {
  throw new NotFoundError('Project not found');
}
```

### Route Handler Patterns

**Type-Safe Route Definitions:**

```typescript
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

// Define schemas
const ParamsSchema = z.object({
  id: z.string().cuid(),
});

const QuerySchema = z.object({
  includeHidden: z.boolean().optional(),
});

const BodySchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
});

// Type-safe route handler
export async function projectRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Params: z.infer<typeof ParamsSchema>;
    Querystring: z.infer<typeof QuerySchema>;
  }>(
    '/api/projects/:id',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: ParamsSchema,
        querystring: QuerySchema,
        response: {
          200: projectResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      // TypeScript knows exact types of:
      // - request.params.id (string)
      // - request.querystring.includeHidden (boolean | undefined)
      // - request.user (JWTPayload from auth plugin)

      const project = await getProjectById(request.params.id);

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      return reply.send({ data: project });
    }
  );
}
```

**Response Schema Enforcement:**

When adding new fields to Fastify responses, you **must** update the Zod response schema:

```typescript
// ❌ BAD - Returns field not in schema, response validation fails
return reply.send({
  data: {
    ...project,
    gitBranch: 'main' // Not in projectResponseSchema!
  }
});

// ✅ GOOD - Update schema first
const projectWithGitSchema = projectResponseSchema.extend({
  gitBranch: z.string().nullable(),
});

// Then use in route schema
schema: {
  response: {
    200: projectWithGitSchema,
  },
}
```

### Error Handling Patterns

**Custom Error Classes:**

```typescript
// Use typed error classes for common scenarios
import { NotFoundError, UnauthorizedError, ValidationError } from '@/server/utils/error';

// In route handler
if (!project) {
  throw new NotFoundError('Project not found');
}

if (project.userId !== request.user.id) {
  throw new ForbiddenError('Access denied');
}

// Validation errors (usually handled by Zod automatically)
if (!isValidPath(path)) {
  throw new ValidationError('Invalid project path');
}
```

**Prisma Error Handling:**

```typescript
import { Prisma } from '@prisma/client';

try {
  await prisma.project.create({ data });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      throw new ValidationError('Project with this path already exists');
    }
    // Record not found
    if (error.code === 'P2025') {
      throw new NotFoundError('Project not found');
    }
  }
  throw error; // Re-throw unknown errors
}
```

### WebSocket Patterns

**Event Naming Convention:**

Use flat event names with dot notation:

```typescript
// ✅ GOOD - Flat event naming
session.{sessionId}.send_message
session.{sessionId}.stream_output
session.{sessionId}.message_complete
session.{sessionId}.error
shell.{sessionId}.init
shell.{sessionId}.input
shell.{sessionId}.output
shell.{sessionId}.exit

// ❌ BAD - Nested or complex names
session:message:send
sessions/123/messages
```

**Message Structure:**

```typescript
interface WebSocketMessage<T = unknown> {
  type: string;  // Event type (e.g., "session.123.send_message")
  data: T;       // Payload (type-safe)
}

// Sending messages
socket.send(JSON.stringify({
  type: `session.${sessionId}.send_message`,
  data: { message: 'Hello', metadata: {} }
}));

// Receiving messages
socket.on('message', (raw) => {
  const message = JSON.parse(raw.toString()) as WebSocketMessage;

  // Type guard for specific events
  if (message.type.endsWith('.stream_output')) {
    const data = message.data as StreamOutputData;
    // Handle streaming output
  }
});
```

**Active Session Management:**

```typescript
// Server tracks active sessions in memory
const activeSessions = new Map<string, ActiveSessionData>();

interface ActiveSessionData {
  adapter: ClaudeAdapter | CodexAdapter;
  projectPath: string;
  userId: string;
  tempImageDir: string;
}

// Always cleanup on disconnect/error
socket.on('close', async () => {
  const session = activeSessions.get(sessionId);
  if (session) {
    // Cleanup temp files
    await fs.rm(session.tempImageDir, { recursive: true, force: true });
    activeSessions.delete(sessionId);
  }
});
```

### Database Patterns

**Using Prisma Client Singleton:**

```typescript
// ✅ GOOD - Import shared client
import { prisma } from '@/shared/prisma';

export async function getProjects() {
  return await prisma.project.findMany();
}

// ❌ BAD - Create new PrismaClient instance
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient(); // Creates connection pool leak!
```

**Handling Relations:**

```typescript
// Fetch project with sessions
const project = await prisma.project.findUnique({
  where: { id },
  include: {
    sessions: {
      orderBy: { updatedAt: 'desc' },
      take: 10,
    },
  },
});

// Nested writes (create project + first session)
const project = await prisma.project.create({
  data: {
    name: 'My Project',
    path: '/path/to/project',
    sessions: {
      create: {
        name: 'Initial Session',
        agent: 'claude',
        userId: user.id,
      },
    },
  },
  include: { sessions: true },
});
```

**Transactions for Related Operations:**

```typescript
// Use transactions when multiple operations must succeed together
const [project, session] = await prisma.$transaction([
  prisma.project.update({
    where: { id: projectId },
    data: { updatedAt: new Date() },
  }),
  prisma.agentSession.create({
    data: {
      projectId,
      userId,
      agent: 'claude',
    },
  }),
]);
```

### Frontend State Management

**When to Use Zustand vs TanStack Query:**

```typescript
// ✅ Use TanStack Query for server state (data from API)
const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: async () => {
    const res = await apiClient.get('/api/projects');
    return res.data.data;
  },
});

// ✅ Use Zustand for client state (UI state, temporary data)
const currentSessionId = useSessionStore((s) => s.currentSessionId);
const setCurrentSession = useSessionStore((s) => s.setCurrentSession);

// ✅ Use Zustand for WebSocket real-time state
const messages = useSessionStore((s) => s.currentSession?.messages);
const addMessage = useSessionStore((s) => s.addMessage);
```

**Query Invalidation After Mutations:**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const createProjectMutation = useMutation({
  mutationFn: async (data: CreateProjectInput) => {
    return await apiClient.post('/api/projects', data);
  },
  onSuccess: () => {
    // Invalidate and refetch projects list
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  },
});
```

### Git Integration Best Practices

**Available Git Operations:**

The app integrates with Git via `simple-git`. Available operations:

```typescript
// Get status (shows modified files, branch, commits ahead/behind)
GET /api/git/status?projectId={id}

// Create commit (with optional AI-generated message)
POST /api/git/commit
{
  projectId: string;
  message?: string;      // Optional: if omitted, AI generates commit message
  files?: string[];      // Optional: specific files to commit (default: all)
}

// List branches
GET /api/git/branches?projectId={id}

// Create pull request (requires gh CLI)
POST /api/git/pr
{
  projectId: string;
  title: string;
  body?: string;
  base?: string;        // Default: main
}
```

**Git Slash Commands:**

Users can execute git operations via slash commands in chat:

```typescript
/commit [message]          // Create commit with optional message
/pr [title]               // Create pull request
/branch [name]            // Create and switch to new branch
/status                   // Show git status
```

### Multi-Agent Architecture

**Supported Agents:**

The app supports multiple AI CLI tools via the `@repo/agent-cli-sdk` package:

1. **Claude Code** (primary) - Anthropic's Claude via CLI
2. **OpenAI Codex** - OpenAI's code assistant
3. **Cursor** (stubbed) - Cursor IDE integration
4. **Gemini** (stubbed) - Google's Gemini

**Agent Adapter Pattern:**

Each agent has:
- `loadSession.ts` - Restore previous session state from metadata
- `parseFormat.ts` - Parse agent-specific response formats
- Integration with `@repo/agent-cli-sdk` adapters

**Session Metadata Structure:**

```typescript
interface SessionMetadata {
  tokenCount?: number;
  messageCount?: number;
  lastMessageAt?: string;
  preview?: string;           // First user message for display
  // Agent-specific data stored here
  claudeSessionId?: string;   // For Claude Code
  codexSessionId?: string;    // For Codex
}
```

### Slash Command System

**Architecture:**

Slash commands extend agent capabilities with custom prompts and workflows:

```typescript
// Command file location (in project directory)
.claude/commands/custom-command.md

// Command definition (Markdown file)
---
name: custom-command
description: Brief description
---

Prompt text that gets sent to the agent when /custom-command is invoked.
Can include variables: {{arg1}}, {{arg2}}
```

**Usage in Chat:**

```typescript
// User types in chat:
/custom-command arg1 arg2

// System expands to prompt and sends to agent
// Parsed by slashCommandUtils.ts on client
// Executed by agent via WebSocket
```

**Built-in Commands:**

- `/commit [message]` - Create git commit
- `/pr [title]` - Create pull request
- `/fix` - Run linter and fix issues
- `/test` - Run test suite
- `/build` - Build project

### File Operations Best Practices

**Supported File Types:**

- **Text files**: `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.html`, `.json`, `.md`, `.py`, etc.
- **Binary files**: Read-only (images displayed, others show file info)
- **Max file size**: ~10MB for editor performance

**File Tree API:**

```typescript
// Get file tree (recursive directory listing)
GET /api/projects/:id/files?path=src&depth=3

// Returns:
{
  data: {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
    children?: FileNode[];
  }
}
```

**Reading/Writing Files:**

```typescript
// Read file
GET /api/projects/:id/files/content?filePath=src/index.ts

// Write file (creates parent directories if needed)
POST /api/projects/:id/files/content
{
  filePath: 'src/new-file.ts',
  content: 'export const foo = "bar";'
}
```

**File Editor Features:**

- **Syntax highlighting**: CodeMirror with language detection
- **Auto-save**: Debounced save on typing (3s delay)
- **Dirty state**: Shows unsaved changes indicator
- **Image preview**: Inline image viewer for `.png`, `.jpg`, `.svg`, etc.
- **Binary file handling**: Shows file info instead of corrupted text

## Security Considerations

### Authentication & Authorization

**Single-User Design:**

This application is designed for **single-user** deployment (personal use, single computer):

- Only **one user** can register
- JWT tokens have **no expiration** (revoked on logout)
- No password reset flow (assumes physical access)
- No role-based access control (single user has full access)

**For Multi-User Deployments:**

If adapting for multi-user use, add:
- Token expiration and refresh mechanism
- Email verification
- Password reset flow
- Role-based access control (RBAC)
- Audit logging
- Rate limiting per user

### Input Validation

**Always Validate User Input:**

```typescript
// ✅ GOOD - Zod schema validation
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  path: z.string().min(1).refine((p) => !p.includes('..'), {
    message: 'Path traversal not allowed',
  }),
});

// ❌ BAD - No validation
const { name, path } = request.body;
await createProject({ name, path }); // Vulnerable to injection!
```

**Path Traversal Prevention:**

```typescript
import path from 'node:path';

// ✅ GOOD - Resolve and validate paths
const projectPath = path.resolve(basePath, userProvidedPath);
if (!projectPath.startsWith(basePath)) {
  throw new ValidationError('Invalid path');
}

// ❌ BAD - Direct concatenation
const filePath = `${projectPath}/${userFile}`; // Vulnerable to ../../../etc/passwd
```

### Secrets Management

**Never Log Secrets:**

```typescript
// ❌ BAD - Logs sensitive data
fastify.log.info({ password, token, apiKey }, 'User login');

// ✅ GOOD - Redact sensitive fields
fastify.log.info({
  username,
  password: '[REDACTED]',
  tokenPrefix: token.substring(0, 8) + '...'
}, 'User login');
```

**Environment Variables:**

- Store secrets in `.env` file (gitignored)
- Use `.env.example` as template (no real secrets)
- Rotate `JWT_SECRET` periodically
- Never commit API keys to version control

### CORS Configuration

**Production CORS:**

```typescript
// In production, restrict CORS origins
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

// Development allows localhost
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3456
```

## Deployment Considerations

### Production Build

```bash
# Build everything
pnpm build

# Output structure:
dist/
├── client/          # Static React app (serve via Fastify)
└── cli.js           # CLI tool (optional, for npm global install)

# Start production server
NODE_ENV=production pnpm start
```

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=3456
HOST=0.0.0.0                    # Listen on all interfaces
JWT_SECRET=<strong-secret>       # Generate: openssl rand -base64 32
LOG_LEVEL=info                  # Or 'warn' for less verbosity
ALLOWED_ORIGINS=https://yourdomain.com
DATABASE_URL=file:./prisma/prod.db
```

### Database Migrations

```bash
# Run migrations in production (after deploying new schema)
pnpm prisma:migrate

# Or use Prisma deploy command
pnpm prisma migrate deploy
```

### Process Management

Use a process manager like PM2 for production:

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/server/index.js --name "agentcmd"

# Save process list
pm2 save

# Setup auto-restart on boot
pm2 startup
```

### Monitoring & Observability

**Recommended Monitoring:**

1. **Application Logs**: Centralize `logs/app.log` to log aggregation service (Datadog, Splunk, etc.)
2. **Uptime Monitoring**: Monitor `/api/health` endpoint
3. **Performance Metrics**: Track response times, error rates
4. **Database**: Monitor SQLite file size and query performance
5. **WebSocket Connections**: Track active sessions count

**Health Check Endpoint:**

```bash
# Use for uptime monitoring
curl http://localhost:3456/api/health

# Returns:
{
  "status": "ok",
  "timestamp": "2025-01-25T12:00:00.000Z",
  "uptime": 3600,  # seconds
  "version": "1.0.0"
}
```

## Troubleshooting Checklist

When encountering issues, work through this checklist:

- [ ] Check server logs: `tail -f apps/web/logs/app.log`
- [ ] Verify server is running: `curl http://localhost:3456/api/health`
- [ ] Check environment variables are set (especially `JWT_SECRET`)
- [ ] Verify database exists and migrations are current: `pnpm prisma:studio`
- [ ] Clear browser cache and local storage
- [ ] Restart both client and server: `pnpm dev:kill && pnpm dev`
- [ ] Check for port conflicts: `lsof -i :3456` and `lsof -i :5173`
- [ ] Verify Node.js version: `node --version` (requires >= 18.0.0)
- [ ] Check pnpm version: `pnpm --version` (requires >= 8.0.0)
- [ ] Review browser console for errors (DevTools > Console)
- [ ] Check Network tab for failed requests (DevTools > Network)
- [ ] Verify WebSocket connections (DevTools > Network > WS filter)
- [ ] Check React DevTools for component state issues
- [ ] Review TanStack Query DevTools for stale queries
- [ ] Verify Claude CLI is installed and accessible: `which claude`
- [ ] Check file permissions on project directories
- [ ] Verify firewall settings aren't blocking connections
- [ ] Check disk space (SQLite requires free space for writes)

## Additional Resources

- **Fastify Documentation**: https://fastify.dev
- **React Router Documentation**: https://reactrouter.com
- **TanStack Query Documentation**: https://tanstack.com/query
- **Zustand Documentation**: https://docs.pmnd.rs/zustand
- **Prisma Documentation**: https://www.prisma.io/docs
- **Zod Documentation**: https://zod.dev
- **Tailwind CSS v4**: https://tailwindcss.com
- **shadcn/ui Components**: https://ui.shadcn.com
- **Claude Code Documentation**: https://docs.anthropic.com/claude/docs/cli
- **@repo/agent-cli-sdk**: See `packages/agent-cli-sdk/CLAUDE.md`