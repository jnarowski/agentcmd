# Context Sources Guide

Where to gather context during the planning phase.

## Overview

Effective planning requires context from multiple sources:
1. **context7 MCP** - External library documentation
2. **Internal docs** - Project-specific patterns and architecture
3. **CLAUDE.md** - Project rules and conventions
4. **Codebase exploration** - Existing implementations

## 1. context7 MCP (Optional)

### What is context7?
MCP server that provides up-to-date documentation for external libraries and frameworks.

**Installation**: https://context7.com/

### When to Use
- Planning feature using external library (React, Fastify, Prisma, etc.)
- Need current API documentation
- Checking best practices for library usage
- Understanding library patterns

### How to Check Availability
Look for tools prefixed with `mcp__context7__` in available tools list.

If not available:
- **Option 1**: Suggest installation to user
- **Option 2**: Fall back to WebFetch/WebSearch
- **Option 3**: Proceed with codebase patterns only

### Example Usage

**Scenario**: Planning React feature using new React 19 hooks

```
If context7 available:
  Use context7 to fetch React 19 hooks documentation
  Check for patterns like useTransition, useOptimistic
  Reference in planning output

If not available:
  Use WebFetch to fetch React docs
  OR proceed with existing React patterns in codebase
```

### Libraries Commonly Needed
- **React 19**: Component patterns, hooks, best practices
- **Fastify**: Route patterns, plugins, lifecycle
- **Prisma**: Query patterns, relations, migrations
- **Zustand**: State management patterns
- **TanStack Query**: Data fetching patterns
- **Zod**: Schema validation patterns

### Graceful Degradation
```
1. Check for context7 tools
2. If available → Use for external docs
3. If not available → Note: "context7 could provide [X] docs"
4. Fall back to WebFetch or existing codebase patterns
5. Continue planning without blocking
```

## 2. Internal Documentation (.agent/docs/)

### What's There
Project-specific architecture, patterns, and design decisions.

**Location**: `/Users/jnarowski/Dev/sourceborn/src/agentcmd/.agent/docs/`

### Key Documents

#### Always Check
```bash
Read: ".agent/docs/README.md" (if exists - index of docs)
```

#### Domain-Specific
Depending on feature area, check relevant docs:
- Architecture patterns
- Design decisions
- Implementation guidelines
- Common pitfalls
- Testing strategies

### How to Use

**Step 1**: List available docs
```bash
Glob: ".agent/docs/*.md"
```

**Step 2**: Read relevant docs based on feature
```bash
# If planning workflow feature
Read: ".agent/docs/workflow-*.md"

# If planning real-time feature
Read: ".agent/docs/websocket*.md"

# If planning agent integration
Read: ".agent/docs/claude-*.md"
```

**Step 3**: Extract patterns and constraints
- What patterns does the project use?
- What are the design constraints?
- What are known issues or gotchas?
- What's the recommended approach?

### Example

**Planning**: Add checkpoint/resume to workflows

```md
Research internal docs:
- Found: `.agent/docs/workflow-engine.md`
- Pattern: Phase-based execution with step isolation
- Constraint: Steps must be idempotent
- Recommendation: Use step IDs for checkpoint tracking
```

## 3. CLAUDE.md (Project Rules)

### What's There
**Critical project rules and conventions** that MUST be followed.

**Location**: `/Users/jnarowski/Dev/sourceborn/src/agentcmd/CLAUDE.md`

### Always Read
```bash
Read: "CLAUDE.md"
```

### Key Sections for Planning

#### Import Conventions
- ✅ No file extensions in imports
- ✅ Always use `@/` aliases
- ✅ No inline imports

**Impact on planning**: Note import style for spec

#### React Best Practices
- useEffect dependencies: Only primitives
- Zustand state: Always immutable
- Null vs undefined: Clear rules

**Impact on planning**: Consider state management approach

#### Backend Architecture
- Domain-driven structure
- One function per file in services
- Pure functions, no classes
- Routes are thin, delegate to domain services

**Impact on planning**: Determines where code lives

#### Schema Organization
- Share validation schemas
- Keep model interfaces separate
- Location patterns

**Impact on planning**: Where to put types and validation

### Example Usage

**Planning**: Add new API endpoint with data validation

```md
From CLAUDE.md:
- Backend rule: Routes are thin, delegate to domain services
- Schema rule: Validation in domain/*/schemas/, use Zod
- Import rule: Use @/ aliases, no extensions

Planning decision:
1. Create route in server/routes/ (thin handler)
2. Create service in domain/[domain]/services/ (business logic)
3. Create schema in domain/[domain]/schemas/ (Zod validation)
4. All imports use @/ aliases
```

## 4. Codebase Exploration

### Finding Existing Patterns

#### Search by Keyword
```bash
# Find how feature is currently implemented
Grep: "notification|alert" output_mode: "files_with_matches"
Grep: "workflow.*execute" output_mode: "content"

# Find type definitions
Grep: "interface.*Session" type: "ts"
Grep: "type.*Workflow" type: "ts"
```

#### Search by File Pattern
```bash
# Find services in domain
Glob: "apps/app/src/server/domain/*/services/*.ts"

# Find React components
Glob: "apps/app/src/client/pages/**/*.tsx"

# Find tests
Glob: "**/*.test.ts"
```

#### Read Similar Code
```bash
# Found similar feature, read implementation
Read: "apps/app/src/server/domain/session/services/executeAgent.ts"

# Read types to understand data model
Read: "apps/app/src/server/domain/workflow/types/WorkflowDefinition.ts"

# Read tests to understand behavior
Read: "apps/app/src/server/domain/session/services/executeAgent.test.ts"
```

### Understanding Architecture

#### Backend Flow
```
1. Find route: apps/app/src/server/routes/*.ts
2. Follow to service: domain/*/services/*.ts
3. Check types: domain/*/types/*.ts
4. Check schema: domain/*/schemas/*.ts or shared/schemas/*.ts
5. Check database: prisma/schema.prisma
```

#### Frontend Flow
```
1. Find page: apps/app/src/client/pages/*/
2. Check component: pages/*/components/ or client/components/
3. Check hook: pages/*/hooks/ or client/hooks/
4. Check store: pages/*/stores/ or client/stores/
5. Check types: pages/*/types/ or shared/types/
```

#### Real-Time Features
```
1. Frontend: Find WebSocket connection setup
2. Backend: Find handler in server/websocket/handlers/
3. Events: Note naming (dots for events, colons for channels)
4. Check: What events are emitted/listened to
```

### Example Exploration

**Planning**: Add user notifications

```bash
# Step 1: Check if notifications exist
Grep: "notification" output_mode: "files_with_matches"
# Result: Nothing found

# Step 2: Look for similar patterns (alerts, toasts, messages)
Grep: "toast|alert|message" output_mode: "files_with_matches"
# Result: Found toast component in client/components/ui/

# Step 3: Check WebSocket for real-time delivery
Grep: "socket.emit" output_mode: "content"
# Result: Found event pattern in websocket/handlers/session.handler.ts

# Step 4: Read session handler for pattern
Read: "apps/app/src/server/websocket/handlers/session.handler.ts"
# Result: Event format: { type: "event.name", data: {...} }

# Step 5: Check database models
Read: "apps/app/prisma/schema.prisma"
# Result: No Notification model exists, will need to create
```

## Context Gathering Workflow

### Recommended Order

1. **CLAUDE.md first** - Understand rules and constraints
2. **Internal docs** - Check for relevant patterns and architecture
3. **Codebase exploration** - Find similar implementations
4. **context7 (if needed)** - External library docs for specific questions

### Output Template

After gathering context, summarize:

```md
## Context Summary

### Project Rules (from CLAUDE.md)
- [Key rules that affect this implementation]

### Internal Patterns (from .agent/docs/)
- [Relevant patterns and guidelines]

### Existing Implementation (from codebase)
- Similar feature: [file:line]
- Pattern to follow: [description]
- Components to extend/reference: [list]

### External References (from context7 or web)
- [Library] documentation: [key points]
- Best practices: [relevant patterns]

### Constraints and Considerations
- [Must follow X pattern]
- [Must integrate with Y system]
- [Cannot break Z API]
```

## Tips

- **Start with CLAUDE.md** - Rules are non-negotiable
- **Leverage internal docs** - Already project-specific
- **Explore before asking** - Code tells the truth
- **Use context7 selectively** - Only for external lib questions
- **Document sources** - Reference file:line for patterns found
- **Fall back gracefully** - If context7 unavailable, continue without it
