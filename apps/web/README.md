# Agent Workflows Web UI

A full-stack web application for orchestrating AI-powered code workflows with a unified interface for multiple AI agents (Claude Code, Codex, Cursor, Gemini).

## Overview

Agent Workflows Web UI is a React 19 + Vite frontend with a Fastify backend and SQLite database, providing:

- **Multi-Agent Chat** - Interact with Claude Code, Codex, Cursor, and Gemini through a unified interface
- **Project Management** - Organize sessions by project with full file system access
- **Real-time Streaming** - WebSocket-based streaming for AI responses with JSONL parsing
- **Built-in Terminal** - Full PTY terminal emulation with xterm.js
- **Git Integration** - Commit changes, manage branches, and create PRs directly from the UI
- **File Explorer & Editor** - Browse and edit files with syntax highlighting via CodeMirror
- **Session Persistence** - All conversations and metadata stored in SQLite with Prisma ORM

## Tech Stack

### Frontend

- **React 19** - UI framework with latest features
- **Vite** - Lightning-fast build tool and dev server
- **React Router 7** - Client-side routing
- **TanStack Query** - Server state management with caching
- **Zustand** - Lightweight client state management
- **Radix UI** - Accessible component primitives
- **Tailwind CSS 4** - Utility-first styling
- **CodeMirror** - Code editor with syntax highlighting
- **xterm.js** - Terminal emulation

### Backend

- **Fastify** - Fast and low-overhead web framework
- **Prisma ORM** - Type-safe database access
- **SQLite** - Embedded database
- **node-pty** - Terminal process management
- **JWT + bcrypt** - Authentication
- **WebSocket** - Real-time communication

### Development

- **TypeScript** - Type safety across the stack
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **ESLint** - Code linting

## Project Structure

```
apps/web/
├── src/
│   ├── client/           # React frontend
│   │   ├── pages/        # Page components (Projects, Sessions, Files, Shell, Git)
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Client utilities
│   │   └── store/        # Zustand state management
│   ├── server/           # Fastify backend
│   │   ├── routes/       # API endpoints (auth, projects, sessions, git)
│   │   ├── services/     # Business logic
│   │   ├── websocket/    # WebSocket handlers
│   │   └── middleware/   # Auth, logging, error handling
│   ├── shared/           # Shared types and utilities
│   └── cli/              # Node CLI tool for setup
├── prisma/
│   └── schema.prisma     # Database schema
├── tests/                # Vitest unit tests
└── e2e/                  # Playwright E2E tests
```

## Getting Started

### Prerequisites

- **Node.js** >= 22.0.0
- **pnpm** >= 8.0.0
- (Optional) **Claude Code CLI** - For Claude agent support
- (Optional) **OpenAI Codex CLI** - For Codex agent support

### Installation

1. **Clone the repository** (if not already done)

   ```bash
   git clone <repository-url>
   cd agent-workflows-monorepo-v2
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up the development environment**

   ```bash
   cd apps/web
   pnpm dev:setup
   ```

   This will:
   - Create `.env` file from `.env.example` with a secure JWT secret
   - Set up the SQLite database at `prisma/dev.db`
   - Run all database migrations
   - Generate the Prisma client

   After setup, edit `.env` to add optional configuration:

   ```bash
   # Optional
   ANTHROPIC_API_KEY=your-anthropic-api-key  # For AI-powered session naming
   LOG_LEVEL=info
   PORT=3456
   VITE_PORT=5173
   ```

### Development

Start the development server (runs both Vite dev server and Fastify backend):

```bash
pnpm dev
```

This starts:

- **Frontend**: http://localhost:5173 (Vite dev server with HMR)
- **Backend**: http://localhost:3456 (Fastify API server)

**Individual dev servers:**

```bash
pnpm dev:client    # Vite dev server only
pnpm dev:server    # Fastify server only
```

**Kill dev servers:**

```bash
pnpm dev:kill      # Kill processes on ports 3456 and 5173
```

### Building

Build for production:

```bash
pnpm build
```

This compiles:

1. TypeScript files
2. Vite production bundle
3. CLI tool (`dist/cli.js`)
4. Prisma schema (copied to `dist/prisma/`)

### Production Deployment

#### Option 1: Run Built Application Locally

```bash
# 1. Build the application
pnpm build

# 2. Set production environment variables
export NODE_ENV=production
export JWT_SECRET=$(openssl rand -base64 32)
export DATABASE_URL="file:/path/to/production/database.db"

# 3. Run Prisma migrations
pnpm prisma:migrate

# 4. Start the server
node dist/server/index.js
```

The server will serve both the API and the built frontend from `dist/client/`.

#### Option 2: Install and Run as Global CLI Tool

```bash
# 1. Build the application
pnpm build

# 2. Create a tarball for distribution
pnpm pack

# 3. Install globally from the tarball
npm install -g ./repo-web-*.tgz

# 4. Run the install command to set up database and config
agent-workflows-ui install

# 5. (Optional) Edit configuration
vim ~/.agents/agent-workflows-ui-config.json

# 6. Start the application
agent-workflows-ui start
```

This creates:

- Database at `~/.agent/database.db`
- Config at `~/.agents/agent-workflows-ui-config.json`

#### Production Environment Variables

For production deployment, ensure these are set:

```bash
# Required
export JWT_SECRET="your-secure-random-secret"  # Generate with: openssl rand -base64 32
export NODE_ENV="production"

# Optional overrides
export PORT=3456
export HOST=0.0.0.0  # To allow external connections
export DATABASE_URL="file:/var/lib/agent-workflows/database.db"
export LOG_LEVEL=warn
export ALLOWED_ORIGINS="https://your-domain.com"
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run all checks (lint + type-check + tests)
pnpm check
```

### Database Management

```bash
# Generate Prisma client (after schema changes)
pnpm prisma:generate

# Create and apply migrations
pnpm prisma:migrate

# Open Prisma Studio (database GUI)
pnpm prisma:studio
```

## CLI Tool

The package includes a CLI tool (`agent-workflows-ui`) for easy installation and management.

### Quick Start

```bash
# Install globally from npm
npm install -g @repo/web
agent-workflows-ui install

# Or run directly from dist without installing
pnpm build
node apps/web/dist/cli.js install
```

### What It Does

- Creates database at `~/.agent/database.db`
- Creates config at `~/.agents/agent-workflows-ui-config.json`
- Runs all database migrations
- One command to set everything up

**📖 For complete CLI documentation, see [CLI.md](./CLI.md)**

## Database Schema

### Models

- **User** - Authentication (username, password hash)
- **Project** - Code projects with file paths, starred/hidden flags
- **AgentSession** - Chat sessions with agent type, metadata (tokens, messages)
- **Workflow** - Future workflow state storage (placeholder)
- **WorkflowStep** - Individual workflow steps (placeholder)

### Agent Types

- `claude` - Claude Code
- `codex` - OpenAI Codex
- `cursor` - Cursor (planned)
- `gemini` - Google Gemini (planned)

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user

### Projects

- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project (star, hide)
- `DELETE /api/projects/:id` - Delete project

### Sessions

- `GET /api/sessions` - List sessions (filterable by project)
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session details
- `DELETE /api/sessions/:id` - Delete session

### Git Operations

- `GET /api/git/status` - Git status for project
- `POST /api/git/commit` - Create commit
- `GET /api/git/branches` - List branches
- `POST /api/git/pr` - Create pull request

### WebSocket

- `ws://localhost:3456/ws/chat` - Real-time chat streaming

## WebSocket Events

### Client → Server

```typescript
{
  type: 'message',
  sessionId: string,
  content: string,
  agentType: 'claude' | 'codex' | 'cursor' | 'gemini'
}
```

### Server → Client

```typescript
// Streaming events
{ type: 'turn.started', sessionId: string, turnId: string }
{ type: 'text', sessionId: string, text: string }
{ type: 'tool.started', sessionId: string, tool: string }
{ type: 'tool.completed', sessionId: string, tool: string, result: any }
{ type: 'turn.completed', sessionId: string }

// Error events
{ type: 'error', message: string }
```

## Environment Variables Reference

| Variable            | Required | Default                 | Description                                                       |
| ------------------- | -------- | ----------------------- | ----------------------------------------------------------------- |
| `JWT_SECRET`        | Yes      | -                       | Secret key for signing JWT tokens (use `openssl rand -base64 32`) |
| `ANTHROPIC_API_KEY` | No       | -                       | Anthropic API key for AI session naming                           |
| `LOG_LEVEL`         | No       | `info`                  | Logging level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |
| `LOG_FILE`          | No       | `./logs/app.log`        | Path to log file                                                  |
| `PORT`              | No       | `3456`                  | Fastify server port                                               |
| `HOST`              | No       | `127.0.0.1`             | Fastify server host                                               |
| `VITE_PORT`         | No       | `5173`                  | Vite dev server port                                              |
| `ALLOWED_ORIGINS`   | No       | `http://localhost:5173` | CORS allowed origins (comma-separated)                            |
| `NODE_ENV`          | No       | `development`           | Environment: `development`, `production`, `test`                  |
| `DATABASE_URL`      | No       | `file:./prisma/dev.db`  | SQLite database path                                              |

## Features

### Multi-Agent Chat

- Unified interface for multiple AI agents
- Real-time streaming responses
- Session persistence with metadata tracking
- Token usage tracking
- AI-generated session names

### Project Management

- Create and organize projects by file path
- Star/hide projects for better organization
- File system access and browsing
- File editing with syntax highlighting

### Terminal Integration

- Full PTY terminal emulation
- Multiple terminal sessions per project
- Command history
- Copy/paste support

### Git Integration

- View git status
- Create commits with AI assistance
- Branch management
- Pull request creation

### Session Management

- Create new sessions or continue existing ones
- View session history
- Delete unwanted sessions
- Export session transcripts

## Development Guidelines

### Code Style

- Import React hooks directly (e.g., `import { useEffect, useState } from 'react'`)
- Unit tests should be co-located with source files
- Follow project instructions in `CLAUDE.md`

### Adding New Features

1. Update Prisma schema if needed
2. Generate Prisma client: `pnpm prisma:generate`
3. Create migration: `pnpm prisma:migrate`
4. Add server routes/services
5. Update API types in `src/shared/types.ts`
6. Implement frontend components/pages
7. Add tests

### Fastify Response Schemas

When adding response fields, update both:

1. Route handler response
2. Zod schema in route definition (e.g., `200: projectResponseSchema`)

## Troubleshooting

### Port Already in Use

```bash
pnpm dev:kill  # Kill processes on ports 3456 and 5173
```

### Database Issues

```bash
# Reset and recreate database
rm prisma/dev.db
pnpm dev:setup

# Or manually run migrations only
pnpm prisma:migrate

# View database in Prisma Studio
pnpm prisma:studio
```

### Build Failures

```bash
# Clean and rebuild
rm -rf dist/
pnpm build
```

## Contributing

1. Follow existing code style and conventions
2. Add tests for new features
3. Update documentation as needed
4. Run `pnpm check` before committing

## License

[Your License Here]
