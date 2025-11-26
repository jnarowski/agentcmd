# Research Checklist

Systematic approach to exploring the codebase before planning implementation.

## General Research Pattern

### 1. Find Similar Existing Features
**Goal**: Understand if this has been done before or if similar patterns exist

**Techniques**:
```bash
# Search for keywords related to the feature
Grep pattern: "notification|alert|toast"
Grep pattern: "auth|session|login"
Grep pattern: "workflow|step|phase"

# Find relevant files by name
Glob pattern: "**/*notification*"
Glob pattern: "**/*auth*"

# Search for type definitions
Grep pattern: "interface.*Notification"
Grep pattern: "type.*Session"
```

**Questions to answer**:
- Has this been implemented before?
- What patterns does the codebase use for similar features?
- Are there existing utilities/helpers to leverage?

### 2. Identify Domain/Area
**Goal**: Determine where this feature belongs in the architecture

**Check**:
- `apps/app/src/server/domain/` - Which domain is this?
  - `workflow/` - Workflow execution, steps, runs
  - `session/` - Agent sessions, chat
  - `project/` - Project management
  - `file/` - File operations
  - `git/` - Git operations
  - `shell/` - Terminal operations
- Does this need a new domain or extend existing?
- Is this cross-cutting (touches multiple domains)?

**Grep patterns**:
```bash
# Find domain services
Glob: "apps/app/src/server/domain/*/services/*.ts"

# Find domain types
Glob: "apps/app/src/server/domain/*/types/*.ts"
```

### 3. Locate Related Components

#### Backend (if applicable)
- **Services**: `domain/*/services/` - One function per file
- **Schemas**: `domain/*/schemas/` or `shared/schemas/` - Zod validation
- **Types**: `domain/*/types/` - TypeScript interfaces
- **Routes**: `server/routes/` - HTTP endpoints
- **WebSocket**: `server/websocket/handlers/` - Real-time handlers

#### Frontend (if applicable)
- **Pages**: `client/pages/projects/*` - Feature-based organization
- **Components**: `client/components/` - Shared UI
- **Hooks**: `client/hooks/` or feature-specific `pages/*/hooks/`
- **Stores**: `client/stores/` or feature-specific `pages/*/stores/`

#### Database (if applicable)
- **Schema**: `prisma/schema.prisma` - Data models
- **Migrations**: `prisma/migrations/` - Schema changes

### 4. Check Test Patterns
**Goal**: Understand how to test this feature

```bash
# Find test files
Glob: "**/*.test.ts"
Glob: "**/*.spec.ts"

# Look at domain-specific tests
Read: "apps/app/src/server/domain/{domain}/services/*.test.ts"

# Find test utilities
Glob: "**/*test*util*"
Glob: "**/*fixture*"
```

**Questions to answer**:
- What testing approach does the codebase use?
- Are there test utilities/fixtures to reuse?
- What's the test coverage expectation?

### 5. Review Database Models (if applicable)
**Goal**: Understand data structure needs

```bash
# Read Prisma schema
Read: "apps/app/prisma/schema.prisma"

# Search for related models
Grep pattern: "model Workflow"
Grep pattern: "model Session"
```

**Questions to answer**:
- Do we need new models?
- Can we extend existing models?
- What relationships are needed?

## Internal Documentation

### Check `.agent/docs/`
Explore internal documentation for patterns and guidance:

```bash
# List all docs
Glob: ".agent/docs/*.md"

# Common useful docs
Read: ".agent/docs/workflow-engine.md"
Read: ".agent/docs/websockets.md"
Read: ".agent/docs/claude-tool-result-patterns.md"
```

Look for:
- Architecture patterns
- Design decisions
- Implementation guidelines
- Common pitfalls

### Check `CLAUDE.md`
Project-specific rules and conventions:

```bash
Read: "CLAUDE.md"
```

Focus on:
- Import conventions (no extensions, use @/ aliases)
- React best practices (useEffect deps, Zustand)
- Backend architecture (domain structure, pure functions)
- Schema organization
- Database best practices

## Codebase Exploration Patterns

### Finding Patterns
```bash
# Find how feature X is implemented
Grep: "export.*function.*create.*" type: "ts"
Grep: "interface.*Props" glob: "**/*.tsx"

# Find WebSocket handlers
Grep: "socket.on|socket.emit"

# Find API routes
Glob: "apps/app/src/server/routes/*.ts"

# Find Prisma usage
Grep: "prisma\\." type: "ts"
```

### Understanding Flow
1. **Frontend → Backend**:
   - Start: Component → Hook → API call
   - Middle: Route → Domain service
   - End: Database or external system

2. **Real-time Features**:
   - Frontend: WebSocket connection
   - Backend: WebSocket handler
   - Events: Check event naming (dots for events, colons for channels)

3. **Workflow Steps**:
   - Definition: Workflow types
   - Execution: Engine services
   - Monitoring: WebSocket events

## Research Output Template

After research, summarize findings:

```md
## Research Findings

### Existing Patterns
- Found similar implementation in: [file:line]
- Pattern to follow: [description]
- Utilities to leverage: [list]

### Architecture
- Domain: [which domain]
- Components affected:
  - Backend: [services, routes, etc.]
  - Frontend: [pages, components, etc.]
  - Database: [models needed]

### Technical Approach
- [High-level approach based on research]
- [Key design decisions]
- [Integration points]

### Initial Complexity
- Estimated: [1-10]/10
- Rationale: [why this complexity]
- Cross-cutting? [yes/no]

### Unresolved Questions
- [Question 1]
- [Question 2]
```

## Tips

- **Start broad, narrow down**: Begin with keyword searches, then dive into specific files
- **Follow the imports**: Read a file and follow its imports to understand dependencies
- **Check git history**: `git log -p [file]` to see how similar features evolved
- **Use context7**: If researching external libraries, fetch docs via context7 MCP
- **Document as you go**: Note file paths and patterns for handoff to spec generation
