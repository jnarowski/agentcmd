# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Turborepo monorepo** for AI agent workflow tools, featuring:

- **`apps/web`**: Full-stack application (React + Vite frontend, Fastify backend) for managing and visualizing AI agent workflows with chat interface, file editor, and terminal
- **`@repo/agent-cli-sdk`**: TypeScript SDK for orchestrating AI-powered CLI tools (Claude Code, OpenAI Codex, Gemini) programmatically
- **`agentcmd-workflows`**: Core workflow utilities library with automatic state persistence, logging, and error handling
- **Shared packages**: UI components, ESLint configs, TypeScript configs

## Essential Commands

### Monorepo-Level Commands (from root)

```bash
# Install all dependencies
pnpm install

# Build all packages (Turborepo handles dependencies)
pnpm build

# Lint all packages
pnpm lint

# Type-check all packages
pnpm check-types

# Validate everything (lint + type-check)
# Note: Tests run at package level, not monorepo level
pnpm check

# Format code
pnpm format
```

### Web App Development (from `apps/web/`)

```bash
# First-time setup (creates .env, applies database migrations)
pnpm dev:setup

# Start dev servers (client + server concurrently)
# Note: Automatically runs 'prisma migrate deploy' on startup
pnpm dev

# Start only backend (port 3456)
pnpm dev:server

# Start only frontend (port 5173)
pnpm dev:client

# Database operations
pnpm prisma:generate     # Generate Prisma client
pnpm prisma:migrate      # Create and run migrations (development)
pnpm prisma:studio       # Open database GUI

# Testing
pnpm test                # Run tests
pnpm test:watch          # Watch mode
pnpm test:ui             # Open Vitest UI

# Build and start production
pnpm build
pnpm start
```

### CLI Tool Usage (Production Distribution)

The web app can be distributed as a CLI tool with built-in server and database.

```bash
# First-time installation
npx agentcmd install
# Creates ~/.agentcmd/ directory with:
# - config.json (ports, API keys, secrets)
# - database.db (SQLite database)
# - logs/app.log (application logs)

# Start server (uses config.json defaults)
npx agentcmd start
# Server: http://localhost:3456
# Inngest UI: http://localhost:8288

# Start with custom ports (CLI flags override config)
npx agentcmd start --port 8080 --inngest-port 9000

# Allow remote access
npx agentcmd start --host 0.0.0.0

# View current configuration
npx agentcmd config --show

# Edit configuration in $EDITOR
npx agentcmd config --edit

# Get specific config value
npx agentcmd config --get port

# Set specific config value
npx agentcmd config --set port=7000

# Get config file path
npx agentcmd config --path
```

**Configuration Priority (POSIX standard):**
1. CLI flags (highest priority)
2. `~/.agentcmd/config.json`
3. Hardcoded defaults (lowest priority)

**Rebranding:**
To rebrand the CLI tool, change `CLI_NAME` in `apps/web/src/cli/utils/constants.ts`:
```typescript
export const CLI_NAME = 'your-tool-name';  // Changes ~/.agentcmd/ to ~/.your-tool-name/
```

### Package Development

```bash
# Build specific package
pnpm --filter @repo/agent-cli-sdk build
pnpm --filter agentcmd-workflows build

# Run tests in specific package
cd packages/agent-cli-sdk
pnpm test                # Run all tests
pnpm test:watch          # Watch mode
pnpm test:e2e            # E2E tests with real CLI (180s timeout)
pnpm test:e2e:claude     # Claude-specific E2E tests
pnpm test:e2e:codex      # Codex-specific E2E tests
pnpm test:e2e:gemini     # Gemini-specific E2E tests

# Run single test file
pnpm vitest run src/path/to/file.test.ts

# agentcmd-workflows package
cd packages/workflow-sdk
pnpm test                # Run all tests
pnpm test:watch          # Watch mode
pnpm check               # Run lint + type-check + tests
```

## Architecture Overview

### Monorepo Structure

```
.
├── .agent/                      # Agent workflow artifacts
│   ├── generated/              # Auto-generated code (DO NOT edit manually)
│   │   ├── slash-commands.ts   # Generated slash command types and utilities
│   │   └── README.md           # Regeneration instructions
│   └── docs/                   # Extended documentation
│       ├── claude-tool-result-patterns.md
│       ├── testing-best-practices.md
│       └── websockets.md
│
├── apps/
│   └── web/                    # Full-stack workflow UI application
│       ├── src/
│       │   ├── cli/            # CLI tool for production distribution
│       │   │   ├── commands/   # CLI commands (install, start, config)
│       │   │   │   ├── install.ts   # Database + config initialization
│       │   │   │   ├── start.ts     # Start server with config merging
│       │   │   │   └── config.ts    # Config management (show, edit, get, set)
│       │   │   ├── utils/      # CLI utilities
│       │   │   │   ├── constants.ts # CLI_NAME and defaults (rebrand here)
│       │   │   │   ├── paths.ts     # Home directory path helpers
│       │   │   │   ├── config.ts    # JSON config loading/saving
│       │   │   │   └── portCheck.ts # Port availability checking
│       │   │   └── index.ts    # Commander CLI entry point
│       │   ├── client/         # React frontend (Vite)
│       │   │   ├── assets/
│       │   │   ├── components/ # Shared components
│       │   │   │   ├── ai-elements/  # AI chat UI components
│       │   │   │   ├── backgrounds/  # Animated backgrounds
│       │   │   │   └── ui/           # shadcn/ui components (kebab-case)
│       │   │   ├── contexts/   # React contexts (AuthContext)
│       │   │   ├── hooks/      # Shared hooks
│       │   │   ├── layouts/    # Layout components
│       │   │   ├── lib/        # Client utilities
│       │   │   ├── pages/      # Route pages (feature-based)
│       │   │   │   ├── auth/   # Authentication feature
│       │   │   │   ├── projects/ # Projects feature
│       │   │   │   │   ├── components/
│       │   │   │   │   ├── hooks/
│       │   │   │   │   ├── sessions/  # Chat/agent sessions
│       │   │   │   │   ├── files/     # File editor
│       │   │   │   │   └── shell/     # Terminal
│       │   │   │   └── *.tsx   # Top-level pages
│       │   │   ├── providers/  # React providers
│       │   │   ├── stores/     # Zustand stores (global state)
│       │   │   └── utils/      # Client utilities
│       │   │
│       │   ├── server/         # Fastify backend
│       │   │   ├── config/     # Configuration
│       │   │   ├── domain/     # Domain-driven business logic
│       │   │   │   ├── file/       # File operations domain
│       │   │   │   │   ├── services/    # One function per file
│       │   │   │   │   ├── schemas/     # Zod validation
│       │   │   │   │   └── types/       # Domain types
│       │   │   │   ├── git/        # Git operations domain
│       │   │   │   ├── project/    # Project management domain
│       │   │   │   ├── session/    # Agent sessions domain
│       │   │   │   └── shell/      # Shell/terminal domain
│       │   │   ├── errors/     # Custom error classes
│       │   │   ├── plugins/    # Fastify plugins (auth)
│       │   │   ├── routes/     # HTTP route handlers (thin)
│       │   │   ├── schemas/    # Legacy schemas (being migrated to domain/)
│       │   │   ├── services/   # Legacy services (being migrated to domain/)
│       │   │   ├── utils/      # Server utilities
│       │   │   ├── websocket/  # WebSocket infrastructure
│       │   │   │   ├── handlers/       # WebSocket handlers
│       │   │   │   └── infrastructure/ # WebSocket core
│       │   │   └── index.ts    # Server entry point
│       │   │
│       │   └── shared/         # Code shared between client/server
│       │       ├── types/      # Shared TypeScript types
│       │       ├── utils/      # Shared utilities
│       │       ├── websocket/  # WebSocket types
│       │       └── prisma.ts   # Prisma client singleton
│       │
│       ├── prisma/             # Database schema and migrations
│       │   ├── migrations/     # Migration files
│       │   ├── schema.prisma   # Database schema
│       │   └── dev.db          # SQLite database (development)
│       │
│       ├── logs/               # Server logs
│       │   └── app.log         # Primary log file
│       │
│       └── scripts/            # Build and setup scripts
│
├── packages/
│   ├── agent-cli-sdk/          # SDK for AI CLI tools
│   │   ├── src/
│   │   │   ├── claude/         # Claude Code integration
│   │   │   ├── codex/          # OpenAI Codex integration
│   │   │   ├── gemini/         # Google Gemini integration
│   │   │   ├── types/          # Unified types across tools
│   │   │   └── utils/          # Process spawning, JSON extraction
│   │   ├── tests/
│   │   │   ├── fixtures/       # JSONL examples for testing
│   │   │   │   ├── claude/
│   │   │   │   ├── codex/
│   │   │   │   └── gemini/
│   │   │   └── e2e/            # E2E tests with real CLI
│   │   │       ├── claude/
│   │   │       ├── codex/
│   │   │       └── gemini/
│   │   └── scripts/            # Fixture extraction scripts
│   │
│   ├── workflow-sdk/           # Workflow orchestration library (agentcmd-workflows)
│   │   ├── src/
│   │   │   ├── cli/            # CLI tool for workflows
│   │   │   ├── storage/        # Storage adapters (FileStorage)
│   │   │   ├── types/          # Core type definitions
│   │   │   ├── utils/          # Helpers (logging, formatting)
│   │   │   └── workflow/       # Workflow class
│   │   ├── examples/           # Reference implementations
│   │   └── bin/                # CLI entry point
│   │
│   ├── ui/                     # Shared React components
│   ├── eslint-config/          # Shared ESLint configs
│   └── typescript-config/      # Shared TypeScript configs
│
├── .claude/                    # Claude Code configuration
├── .cursor/                    # Cursor IDE configuration
├── .vscode/                    # VS Code configuration
├── mocks/                      # Mock data for development
├── scripts/                    # Monorepo-level scripts
├── turbo.json                  # Turborepo task configuration
├── pnpm-workspace.yaml         # pnpm workspace definition
├── package.json                # Root package.json
├── CLAUDE.md                   # This file
├── README.md                   # Project README
├── AGENTS.md                   # Agent documentation
└── LICENSE                     # MIT license
```

### Key Architectural Concepts

**1. Turborepo Build Pipeline**

- Tasks depend on each other: `build` → `lint`, `build` → `check-types`, `build` → `test`
- Use `^build` syntax in turbo.json to ensure dependencies build first
- Caching enabled for faster rebuilds (`.turbo/` directory)
- Run tasks with `pnpm build` from root or `turbo run build`

**2. Workspace Dependencies**

- Packages use `workspace:*` protocol (e.g., `"@repo/agent-cli-sdk": "workspace:*"`)
- Changes to workspace packages require rebuilding dependents
- Prisma client generation happens automatically after `pnpm install` in apps/web

**3. Module Resolution**

- All packages use ESM (`type: "module"`)
- TypeScript with `moduleResolution: "bundler"`
- Use `@/` path aliases in web app: `@/client/*`, `@/server/*`, `@/shared/*`

**Import Extensions:**

**DO NOT include file extensions in imports**:

- ✅ `import { foo } from "./bar"`
- ❌ `import { foo } from "./bar.js"`

**Why**: All packages use `moduleResolution: "bundler"` which tells TypeScript that bundlers (Vite, Bunchee, TSX) will handle extension resolution at build/runtime. Extensions are added automatically during transpilation.

**Generated Files:**

The `.agent/generated/` directory contains auto-generated code that should **be committed to source control** but **never edited manually**:

- **`slash-commands.ts`**: Type-safe slash command types, `SlashCommandArgOrder` constant, and `buildSlashCommand()` utility
- Generated from `.claude/commands/*.md` frontmatter
- Preserves argument positional order from command definitions (fixes object property order issue)
- **Generated per-project** (each project generates types for its own slash commands)

**After editing `.claude/commands/*.md` files, regenerate types:**

```bash
pnpm --filter agentcmd-workflows gen-slash-types
```

**Or if using the package externally:**

```bash
npx agentcmd-workflows generate-slash-types
```

**Import pattern:**

```typescript
// Import from your project's generated file
import { buildSlashCommand } from '../generated/slash-commands';
// or
import { buildSlashCommand } from '../../.agent/generated/slash-commands';
```

**Usage example:**

```typescript
// Arguments can be in any object property order - frontmatter order is preserved
const cmd = buildSlashCommand('/generate-prd', {
  format: 'md',        // 3rd in frontmatter
  featurename: 'auth', // 1st in frontmatter
  context: 'OAuth'     // 2nd in frontmatter
});
// Returns: "/generate-prd 'auth' 'OAuth' 'md'"
```

**4. Multi-Agent Architecture**

The web app supports multiple AI CLI tools:

- **Claude Code** (primary): Full integration with session loading, JSONL parsing
- **OpenAI Codex**: Full integration via agent-cli-sdk
- **Google Gemini**: Full integration via agent-cli-sdk
- **Cursor**: Future support planned

All agents normalized to `UnifiedMessage` format via agent-cli-sdk.

**5. Tool Result Matching Pattern**

All interactive tools in the web app follow a standardized pattern:

- Tool results are matched to tool invocations via `tool_use_id` automatically
- Matching happens once during message enrichment (O(1) Map-based lookup)
- Results are nested into `tool_use` blocks before rendering
- Components receive enriched `{input, result}` props - no manual lookups required
- Images auto-parse to `UnifiedImageBlock`, other content stays as strings
- Pattern documented in `.agent/docs/claude-tool-result-patterns.md`

**6. Domain-Driven Backend Architecture**

The web app backend (`apps/web/src/server/`) follows a domain-driven functional architecture:

**Domain Structure:**

```
server/
├── domain/                 # Business logic organized by domain
│   ├── file/              # File operations domain
│   │   ├── services/      # Pure functions (one per file)
│   │   ├── schemas/       # Zod validation schemas
│   │   └── types/         # Domain-specific types
│   ├── git/               # Git operations domain
│   ├── project/           # Project management domain
│   ├── session/           # Agent session domain
│   └── shell/             # Shell/terminal domain
├── routes/                # Thin HTTP route handlers
├── websocket/             # WebSocket infrastructure
│   ├── handlers/          # WebSocket message handlers
│   └── infrastructure/    # WebSocket core (EventBus)
├── plugins/               # Fastify plugins (auth, etc.)
├── config/                # Centralized configuration
├── errors/                # Custom error classes
└── index.ts               # Server entry point
```

**Key Principles:**

- **One function per file** in `domain/*/services/` - file name matches exported function
- **Group by domain**, not by technical layer (no generic "services/" folder)
- **Pure functions** - all dependencies passed as parameters, no classes
- **Routes are thin orchestrators** - delegate to domain services
- **WebSocket handlers are thin** - business logic stays in domain layer
- **Centralized config** - all environment variables accessed via `config.ts`

**Example Domain Function:**

```typescript
// domain/project/services/getProjectById.ts
export async function getProjectById(id: string): Promise<Project | null> {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return null;

  const currentBranch = await getCurrentBranch(project.path);
  return transformProject(project, currentBranch);
}
```

**Import Pattern:**

```typescript
// ✅ GOOD - Import from domain
import { getProjectById } from "@/server/domain/project/services/getProjectById";
import { readFile } from "@/server/domain/file/services/readFile";

// ❌ BAD - Don't import from old services/ directory
import { getProjectById } from "@/server/services/project.service";
```

## Important Rules & Conventions

### General Monorepo Rules

1. **Build packages before using them**: If you see "module not found" errors, run `pnpm build`
2. **Use workspace protocol**: Always use `workspace:*` for internal package dependencies
3. **Turborepo caching**: Second builds complete in <2s due to caching
4. **No import extensions**: Use `import { foo } from "./bar"` not `import { foo } from "./bar.js"`
5. **Unit tests are co-located**: Place `*.test.ts` next to source files, not in separate `tests/` folder

### Web App Specific Rules

**Backend Domain Organization:**

- ✅ **One function per file** in `domain/*/services/` - file name MUST match exported function name
  - Example: `getProjectById.ts` exports `export async function getProjectById()`
- ✅ **Group by domain**, not by technical layer - use `domain/project/`, `domain/session/`, etc.
- ✅ **Pure functions** - pass all dependencies (logger, config) as parameters, no classes
- ✅ **Thin route handlers** - delegate all business logic to domain services
- ✅ **Import from domain/** - use `@/server/domain/project/services/getProjectById`
- ❌ **Never import from services/** - old pattern, being phased out
- ✅ **WebSocket handlers are thin** - orchestrate domain functions, don't contain business logic
- ✅ **Use centralized config** - import from `@/server/config`, don't access `process.env` directly

**Import Paths:**

- ✅ Always use `@/` aliases: `@/client/*`, `@/server/*`, `@/shared/*`
- ❌ Never use relative imports beyond the same directory

**React Hooks:**

- Import directly: `import { useEffect, useState } from 'react'`
- Not: `React.useEffect`

**useEffect Dependencies:**

- Only include primitive values (strings, numbers, booleans)
- ❌ Bad: `[user, project, data]` (objects cause infinite loops)
- ✅ Good: `[userId, projectId, isEnabled]`
- Zustand store functions are stable - safe to omit from deps

**Zustand State Management:**

- Always update state immutably
- Return new state from `set()` function
- Create new arrays/objects for updates:

  ```typescript
  // ❌ BAD - Mutation
  set((state) => {
    state.messages.push(newMsg);
    return { messages: state.messages };
  });

  // ✅ GOOD - Immutable
  set((state) => ({
    messages: [...state.messages, newMsg],
  }));
  ```

**Fastify Response Schemas:**

- When adding fields to API responses, update Zod schema:
  ```typescript
  schema: {
    response: {
      200: projectResponseSchema,  // Must match response structure
    }
  }
  ```

**File Organization:**

- Feature-based structure under `pages/{feature}/`
- Each feature has: `components/`, `hooks/`, `stores/`, `lib/`, `utils/`
- Only truly shared components go in top-level `components/`
- PascalCase for components, kebab-case only for shadcn/ui components in `components/ui/`

**Testing:**

- Tests go next to the file: `component.tsx` → `component.test.tsx`
- Use `@testing-library/react` for component tests
- Use `happy-dom` as test environment
- Web app has 31 test files

### Package-Specific Rules

**agent-cli-sdk:**

- Files in camelCase: `loadSession.ts`, `parseFormat.ts`
- One primary export per file matching filename
- Use exhaustive type checking with `never` for tool selection
- E2E tests run sequentially (`singleFork: true`)
- Permission modes: `default` (safe), `plan` (read-only), `acceptEdits` (auto-accept), `bypassPermissions` (dangerous)
- Supports Claude, Codex, and Gemini

**agentcmd-workflows:**

- Config-based API (pass config objects, not individual params)
- Result pattern for error handling: `Result<T, E>`
- Use `unwrap()` for fail-fast, or handle `result.ok` explicitly
- Auto-incrementing step numbers via `workflow.currentStepNumber`
- Automatic `completedAt` timestamp when status becomes "completed"

## CLI Tool Architecture

The web app includes a production-ready CLI tool for single-command deployment.

### Storage Location

All user data stored in `~/.agentcmd/` (configurable via `CLI_NAME` constant):

```
~/.agentcmd/
├── config.json       # All settings (ports, API keys, JWT secret)
├── database.db       # SQLite database (shared across all projects)
└── logs/
    └── app.log       # Application logs
```

### Configuration System

**config.json Schema:**
```json
{
  "port": 3456,
  "inngestPort": 8288,
  "host": "127.0.0.1",
  "logLevel": "info",
  "anthropicApiKey": "",
  "jwtSecret": "auto-generated-on-install",
  "allowedOrigins": "http://localhost:3456"
}
```

**Priority Order (POSIX standard):**
1. CLI flags (`--port 8080`)
2. config.json values
3. Constants defaults

**Security:**
- config.json has 600 permissions (user-only read/write)
- JWT secret auto-generated during install
- Secrets stored alongside settings (no separate .env file)

### CLI Commands

**install** - Initialize database and configuration
- Creates `~/.agentcmd/` directory
- Generates JWT secret via `crypto.randomBytes(32)`
- Runs Prisma migrations
- Creates default config.json

**start** - Start server with config merging
- Loads config.json
- Merges CLI flag overrides
- Checks both ports available (main + Inngest)
- Sets process.env from merged config
- Runs `prisma migrate deploy` (auto-apply migrations)
- Starts Fastify server
- Spawns Inngest dev UI child process
- Sets up graceful shutdown (SIGINT/SIGTERM)

**config** - Manage configuration
- `--show` - Display full config + file path
- `--edit` - Open in $EDITOR (falls back to nano)
- `--get <key>` - Get specific value
- `--set <key>=<value>` - Update value programmatically
- `--path` - Print config file path only

### Rebranding

Single change point in `apps/web/src/cli/utils/constants.ts`:

```typescript
export const CLI_NAME = 'agentcmd';  // Change this
export const DEFAULT_PORT = 3456;
export const DEFAULT_INNGEST_PORT = 8288;
export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_LOG_LEVEL = 'info';
```

Changing `CLI_NAME` updates:
- Home directory path (`~/.agentcmd/` → `~/.your-name/`)
- All config/database/log paths
- Success messages and help text

Binary name in package.json must be changed separately.

### Port Configuration

**Two ports required:**
1. **Main port** (default 3456) - Fastify server
   - React app (static build)
   - REST API endpoints (`/api/*`)
   - WebSocket (`/ws`, `/shell`)
   - Inngest function endpoint (`/api/workflows/inngest`)

2. **Inngest port** (default 8288) - Dev UI
   - Browser dashboard for testing workflows
   - Separate Node process (spawned child)
   - Cannot be embedded (separate Inngest CLI tool)

**Port conflict detection:**
- Checks both ports before starting
- Clear error if occupied: "Port 3456 (server) already in use"
- Suggests CLI flag override

### Server Integration

**startServer() function** (`apps/web/src/server/index.ts`):
```typescript
export async function startServer(options?: { port?: number; host?: string }) {
  const serverConfig = config.get("server");
  const PORT = options?.port ?? serverConfig.port;
  const HOST = options?.host ?? serverConfig.host;

  const server = await createServer();
  await server.listen({ port: PORT, host: HOST });
  await setupGracefulShutdown(server, activeSessions, reconnectionManager);

  return server;
}
```

Called by CLI with merged config values.

### Graceful Shutdown

**Cleanup on SIGINT/SIGTERM:**
1. Kill Inngest child process (SIGTERM)
2. Close Fastify server (await server.close())
3. Log shutdown message
4. Exit with code 0

Prevents:
- Orphaned Inngest processes
- Database connection leaks
- Lost in-flight requests

## Development Workflow

### Starting Development

**First Time:**

```bash
# From root
pnpm install
pnpm build

# Set up web app
cd apps/web
pnpm dev:setup    # Creates .env, runs migrations
pnpm dev          # Start both client and server
```

**Ongoing:**

```bash
# From apps/web
pnpm dev          # Runs both client and server with watch mode
```

**Frontend**: http://localhost:5173
**Backend API**: http://localhost:3456
**Logs**: `apps/web/logs/app.log`

### Making Changes

**To Web App Code:**

- Frontend changes: Hot reload automatically
- Backend changes: Server auto-restarts via `tsx watch`

**To Workspace Packages:**

```bash
# Rebuild the package
cd packages/agent-cli-sdk
pnpm build

# Or from root
pnpm --filter @repo/agent-cli-sdk build

# Web app will pick up changes on next import
```

**To Database Schema:**

```bash
cd apps/web
# Edit prisma/schema.prisma
pnpm prisma:generate    # Regenerate client
pnpm prisma:migrate     # Create and run migration
```

### Running Tests

```bash
# Web app tests
cd apps/web
pnpm test               # Run all tests
pnpm test:watch         # Watch mode
pnpm test:ui            # Vitest UI

# agent-cli-sdk tests
cd packages/agent-cli-sdk
pnpm test               # Unit tests
pnpm test:watch         # Watch mode
pnpm test:e2e           # All E2E tests (180s timeout)
pnpm test:e2e:claude    # Claude E2E tests
pnpm test:e2e:codex     # Codex E2E tests
pnpm test:e2e:gemini    # Gemini E2E tests

# agentcmd-workflows tests
cd packages/workflow-sdk
pnpm test               # Run all tests
pnpm test:watch         # Watch mode

# Single test file
pnpm vitest run src/path/to/file.test.ts
```

### Build System Details

**When Builds Happen:**

- ✅ Explicit: `pnpm build`
- ✅ Development: Turborepo rebuilds on changes
- ✅ Publishing: `prepublishOnly` hook
- ✅ Prisma: Always after `pnpm install` in apps/web
- ❌ NOT during `pnpm install` for TypeScript packages

**Build Tools:**

- **Turborepo**: Orchestrates builds with caching
- **Vite**: Frontend bundling (web app)
- **TSC**: Server-side TypeScript compilation (web app)
- **Bunchee**: Package bundling (agent-cli-sdk, agentcmd-workflows)

**Clean Build:**

```bash
# Remove all build artifacts
rm -rf packages/*/dist apps/*/dist

# Rebuild everything
pnpm build
```

## Debugging & Troubleshooting

### Web App Debugging

**Check Server Logs:**

```bash
# Real-time log watching
tail -f apps/web/logs/app.log

# Pretty-printed with jq
tail -f apps/web/logs/app.log | jq .

# Filter for errors (level >= 50)
tail -f apps/web/logs/app.log | jq 'select(.level >= 50)'
```

**Common Issues:**

1. **WebSocket connection failures**: Check logs, verify server running, check JWT token
2. **Database locked**: Kill node processes, restart dev server
3. **Agent not streaming**: Verify CLI installed (`which claude`), check WebSocket events
4. **File operations failing**: Check permissions, verify project path
5. **Auth issues**: Check JWT_SECRET, regenerate token

**Health Check:**

```bash
curl http://localhost:3456/api/health
```

**Test Authentication:**

```bash
curl -X POST http://localhost:3456/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### Package Debugging

**TypeScript Errors:**

```bash
# Regenerate Prisma client
cd apps/web
pnpm prisma:generate

# Check TypeScript across all packages
pnpm check-types

# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Module Not Found:**

```bash
# Build the missing package
pnpm --filter @repo/agent-cli-sdk build

# Or build all packages
pnpm build
```

**Test Failures:**

```bash
# Run with verbose output
pnpm test --reporter=verbose

# Run specific test
pnpm vitest run path/to/test.test.ts
```

## Technology Stack

### Web App

- **Frontend**: React 19, Vite, React Router, TanStack Query, Zustand
- **Backend**: Fastify, WebSocket, Prisma (SQLite), JWT auth
- **UI**: Tailwind CSS v4, shadcn/ui (Radix UI components)
- **Code Editor**: CodeMirror (via @uiw/react-codemirror) with syntax highlighting
- **Terminal**: xterm.js (via @xterm/xterm) with node-pty
- **AI SDK**: Vercel AI SDK (@ai-sdk/anthropic, @ai-sdk/openai)

### Packages

- **agent-cli-sdk**: TypeScript, cross-spawn, Vitest, boxen, chalk
- **agentcmd-workflows**: TypeScript, simple-git, gray-matter, Zod, Vitest
- **Build Tools**: Turborepo, Bunchee, TSX, ESBuild

### Key Dependencies

- **Node.js**: >= 22.0.0 (agent-cli-sdk, agentcmd-workflows), >= 18.0.0 (monorepo)
- **pnpm**: 10.19.0 (package manager)
- **TypeScript**: 5.9.x
- **React**: 19.1.x
- **Fastify**: 5.6.x
- **Prisma**: 6.17.x
- **Vite**: 7.1.x
- **Vitest**: 4.0.x (web), 3.2.x (agentcmd-workflows), 2.0.x (agent-cli-sdk)

## Environment Variables

### Web App (apps/web/.env)

**Required:**

- `JWT_SECRET`: JWT signing key (generate: `openssl rand -base64 32`)
- `DATABASE_URL`: SQLite database path (default: `file:./dev.db`)

**Optional (with defaults):**

- `PORT`: Backend port (default: 3456)
- `VITE_PORT`: Frontend port (default: 5173)
- `HOST`: Server host (default: 127.0.0.1)
- `LOG_LEVEL`: Logging level (default: info) - Options: trace, debug, info, warn, error, fatal
- `LOG_FILE`: Log file path (default: ./logs/app.log)
- `ALLOWED_ORIGINS`: CORS origins (default: http://localhost:5173)
- `NODE_ENV`: Environment (default: development)
- `VITE_ENABLE_BACKGROUNDS`: Enable animated backgrounds (default: true)
- `VITE_WS_HOST`: WebSocket host override for remote access (e.g., Tailscale IP)
- `ANTHROPIC_API_KEY`: For AI features (session name generation, etc.)

See `.env.example` for complete configuration template.

**First-time setup:**

```bash
cd apps/web
pnpm dev:setup    # Auto-generates .env from .env.example
```

## Publishing Packages

### agent-cli-sdk

```bash
cd packages/agent-cli-sdk
# Build and publish manually
pnpm build
npm publish
```

### agentcmd-workflows

```bash
cd packages/workflow-sdk
pnpm ship
# Runs: build → version patch → commit → tag → push → publish
```

## Additional Resources

- **Extended Documentation**: See `.agent/docs/` for detailed guides:
  - `claude-tool-result-patterns.md`: Tool result matching pattern
  - `testing-best-practices.md`: Testing conventions
  - `websockets.md`: WebSocket architecture
  - Agent-specific docs: `claude.md`, `codex.md`, `gemini.md`, `cursor-agent.md`
- **Web App Guide**: See `apps/web/CLAUDE.md` for detailed web app architecture
- **agent-cli-sdk Guide**: See `packages/agent-cli-sdk/CLAUDE.md` for SDK details
- **agentcmd-workflows Guide**: See `packages/workflow-sdk/CLAUDE.md` for workflow utilities
- **README**: See `README.md` for getting started and project overview
- **Turborepo Docs**: https://turborepo.com/docs

## Quick Reference

**File Locations:**

- Server logs: `apps/web/logs/app.log`
- Database: `apps/web/prisma/dev.db`
- Workflow logs: `.agent/workflows/logs/{workflowId}/`
- Build output: `dist/` in each package/app
- Generated files: `.agent/generated/` (DO NOT edit manually)
- Extended docs: `.agent/docs/`

**Port Numbers:**

- Frontend dev server: 5173
- Backend API: 3456
- Prisma Studio: 5555

**Common Tasks:**

- Add new dependency: `pnpm add <package>` (in specific workspace)
- Add dev dependency: `pnpm add -D <package>`
- Remove dependency: `pnpm remove <package>`
- Update dependencies: `pnpm update`
- Clear Turborepo cache: `rm -rf .turbo`
- Regenerate slash command types: `pnpm --filter agentcmd-workflows gen-slash-types` (after editing `.claude/commands/*.md`)

## Important

1. In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

## Plans

- At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise. Sacrifice grammar for the sake of concision.
