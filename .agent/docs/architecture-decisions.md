# Architecture Decisions

Rationale behind key architectural choices in agentcmd.

## Backend Architecture

### Domain-Driven Design

**Decision:** Organize backend code by domain with one function per file.

**Rationale:**
- **Clear boundaries** - Each domain (project, session, workflow, git) is self-contained
- **Easy navigation** - File name matches function name
- **Testability** - Pure functions easy to test in isolation
- **Scalability** - Domains can grow independently
- **Discoverability** - No hunting through large service classes

**Structure:**
```
domain/
├── project/services/
│   ├── getProjectById.ts      # One function
│   ├── createProject.ts       # One function
│   └── updateProject.ts       # One function
```

**Alternative Considered:**
- Class-based services (rejected: stateful, hard to test, couples code)
- Grouped functions in files (rejected: hard to navigate, violates SRP)

### Pure Functions Over Classes

**Decision:** Use pure functions with explicit parameters, no classes.

**Rationale:**
- **Testability** - No mocking dependencies or dealing with `this`
- **Composability** - Easy to combine functions
- **Predictability** - Same inputs → same outputs
- **Simplicity** - No lifecycle, no state management
- **Parallel execution** - No shared state concerns

**Example:**
```typescript
// ✅ Pure function
export async function getProjectById({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
  return await prisma.project.findUnique({
    where: { id: projectId, userId },
  });
}

// ❌ Class-based (rejected)
class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async getById(projectId: string, userId: string) {
    return await this.prisma.project.findUnique({
      where: { id: projectId, userId },
    });
  }
}
```

### Thin Routes, Fat Services

**Decision:** Routes delegate to domain services, contain no business logic.

**Rationale:**
- **Separation of concerns** - HTTP layer separate from business logic
- **Reusability** - Services can be called from routes, WebSocket, Inngest
- **Testability** - Test business logic without HTTP concerns
- **Maintainability** - Changes to logic don't require route changes

**Pattern:**
```typescript
// Route (thin)
fastify.get("/:id", async (request, reply) => {
  const project = await getProjectById({
    projectId: request.params.id,
    userId: request.user!.userId,
  });

  if (!project) throw new NotFoundError("Project not found");

  return project;
});

// Service (fat)
export async function getProjectById({ projectId, userId }) {
  const [project, sessionCount] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId, userId } }),
    prisma.session.count({ where: { projectId } }),
  ]);

  if (!project) return null;

  return transformProjectToResponse(project, { sessionCount });
}
```

### Centralized Configuration

**Decision:** All config in `@/server/config`, never access `process.env` directly.

**Rationale:**
- **Type safety** - Config is typed and validated
- **Defaults** - Central place for default values
- **Testing** - Easy to mock configuration
- **Documentation** - Self-documenting config structure
- **Validation** - Fail fast on startup with invalid config

**Alternative Considered:**
- Direct `process.env` access (rejected: scattered, untyped, error-prone)
- Config files (rejected: more complex, environment-specific builds)

## Frontend Architecture

### Feature-Based Organization

**Decision:** Organize code by feature, not by type (components/hooks/stores together).

**Rationale:**
- **Cohesion** - Related code lives together
- **Discoverability** - Easy to find all code for a feature
- **Deletion** - Delete feature by deleting folder
- **Boundaries** - Clear feature boundaries prevent coupling
- **Scalability** - Features grow independently

**Structure:**
```
pages/projects/sessions/    # Feature
├── components/             # Feature-specific
├── hooks/
├── stores/
├── types/
└── ProjectSession.tsx
```

**Alternative Considered:**
- Type-based organization (rejected: scattered code, hard to navigate, tight coupling)

### Zustand + TanStack Query

**Decision:** Zustand for client state, TanStack Query for server state.

**Rationale:**

**Zustand:**
- **Simplicity** - No boilerplate, minimal API
- **Performance** - Fine-grained subscriptions, no unnecessary re-renders
- **DevTools** - Good debugging experience
- **Persistence** - Built-in localStorage support
- **TypeScript** - Excellent type inference

**TanStack Query:**
- **Caching** - Automatic request deduplication and caching
- **Stale-while-revalidate** - Fast UX with background updates
- **DevTools** - Inspect queries and cache
- **Mutations** - Optimistic updates and rollback
- **SSR Ready** - If needed in future

**Alternative Considered:**
- Redux (rejected: too much boilerplate, overkill for this app)
- Context API (rejected: performance issues, no caching)
- Combined state (rejected: mixing client/server state is anti-pattern)

### React 19

**Decision:** Use latest React 19 with new features.

**Rationale:**
- **Performance** - Improved rendering and hydration
- **Actions** - Better form handling
- **use()** - Cleaner async rendering
- **Future-proof** - Stay current with ecosystem
- **Hooks improvements** - Better ref handling, useOptimistic

## Data Layer

### SQLite + Prisma

**Decision:** SQLite for database, Prisma for ORM.

**Rationale:**

**SQLite:**
- **Zero config** - File-based, no server needed
- **Portable** - Single file, easy backups
- **Performance** - Fast for single-user/team use
- **Simplicity** - No connection pools, no authentication
- **Development** - Same database dev and prod

**Prisma:**
- **Type safety** - Generated types from schema
- **Migrations** - Declarative schema with automatic migrations
- **Developer experience** - Excellent TypeScript support
- **Prisma Studio** - GUI for database browsing
- **Flexibility** - Can migrate to PostgreSQL/MySQL if needed

**Alternative Considered:**
- PostgreSQL (rejected: overkill for single-user tool, more complex setup)
- TypeORM (rejected: less type-safe, more boilerplate)
- Raw SQL (rejected: no type safety, manual migrations)

## Monorepo

### Turborepo

**Decision:** Turborepo for monorepo management.

**Rationale:**
- **Speed** - Caching and parallel execution
- **Simple** - Less config than Nx
- **Developer experience** - Fast builds and tests
- **Package isolation** - Clear dependencies
- **Sharing** - Share code between app and CLI

**Structure:**
```
├── apps/
│   ├── app/              # Main application
│   └── website/          # Marketing site
├── packages/
│   ├── agent-cli-sdk/    # AI CLI orchestration
│   └── agentcmd-workflows/ # Workflow SDK
```

**Alternative Considered:**
- Nx (rejected: more complex, overkill for this project)
- Lerna (rejected: less modern, slower builds)
- Separate repos (rejected: code duplication, versioning hell)

## Real-Time Communication

### WebSocket with EventBus

**Decision:** WebSocket for real-time, EventBus for pub/sub.

**Rationale:**
- **Decoupling** - Services emit events, don't know about WebSocket
- **Flexibility** - Same events can drive WebSocket, Inngest, logs
- **Testability** - Test events without WebSocket infrastructure
- **Scalability** - Easy to add more event consumers
- **Observability** - Central place to monitor all events

**EventBus Pattern:**
```
Domain Service → EventBus → WebSocket Handler → Client
```

**Alternative Considered:**
- Direct socket manipulation (rejected: tight coupling, hard to test)
- HTTP polling (rejected: inefficient, poor UX)
- Server-Sent Events (rejected: unidirectional, less flexible)

## Workflow System

### Inngest

**Decision:** Inngest for workflow orchestration.

**Rationale:**
- **Reliability** - Automatic retries, error handling
- **Observability** - Built-in dashboard and logging
- **Developer experience** - TypeScript-first, excellent DX
- **Step functions** - Compose complex workflows from steps
- **Background jobs** - Long-running workflows don't block requests
- **Local dev** - Dev server for testing

**Alternative Considered:**
- BullMQ (rejected: more infrastructure, Redis dependency)
- Temporal (rejected: heavy, complex setup)
- Custom implementation (rejected: reinventing wheel, no observability)

## Styling

### Tailwind CSS v4

**Decision:** Tailwind CSS for styling.

**Rationale:**
- **Productivity** - Rapid development with utility classes
- **Consistency** - Design system built-in
- **Performance** - Purges unused CSS
- **Customization** - Easy to extend with design tokens
- **TypeScript** - Autocomplete with plugin

**Alternative Considered:**
- CSS Modules (rejected: more boilerplate, less consistent)
- Styled Components (rejected: runtime cost, larger bundle)
- Plain CSS (rejected: no design system, hard to maintain)

### shadcn/ui

**Decision:** shadcn/ui for component library.

**Rationale:**
- **Ownership** - Copy components into codebase, full control
- **Customization** - Easy to modify without fighting library
- **Accessibility** - Built on Radix UI primitives
- **No dependency hell** - Not an npm package to version
- **Tailwind native** - Designed for Tailwind CSS

**Alternative Considered:**
- Material UI (rejected: heavy, hard to customize)
- Chakra UI (rejected: different styling approach)
- Custom from scratch (rejected: too much work, reinventing)

## Key Takeaways

**Simplicity Over Complexity:**
- Pure functions over classes
- SQLite over PostgreSQL
- Zustand over Redux

**Developer Experience:**
- TypeScript everywhere
- Hot reload and fast builds
- Excellent tooling (Prisma Studio, Inngest UI, DevTools)

**Scalability:**
- Feature-based organization
- Domain-driven backend
- EventBus for extensibility

**Future-Proof:**
- React 19 (latest)
- Monorepo (easy to extract packages)
- Prisma (can migrate to PostgreSQL if needed)

## Related Docs

- `.agent/docs/backend-patterns.md` - Domain architecture implementation
- `.agent/docs/frontend-patterns.md` - Feature organization implementation
- `.agent/docs/workflow-system.md` - Inngest integration
- `.agent/docs/database-guide.md` - Prisma patterns
