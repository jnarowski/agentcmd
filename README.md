# agentcmd

> A full-stack web application and TypeScript SDKs for orchestrating AI agent workflows with chat, file editing, and terminal capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8.0+-orange.svg)](https://pnpm.io/)

AI agent workflow management platform built with React, Fastify, and Turborepo. Interact with AI agents (Claude Code, OpenAI Codex) through a modern web interface with real-time chat, file editing, and terminal access.

## ✨ Features

- **Multi-Agent Chat Interface** - Interact with Claude Code, OpenAI Codex, and other AI agents
- **Real-Time File Editor** - Syntax highlighting, auto-save, and collaborative editing
- **Integrated Terminal** - Full terminal access with WebSocket streaming
- **Session Management** - Save, resume, and organize agent conversations
- **Git Integration** - Commit, branch, and PR creation from the interface
- **Project Workspaces** - Manage multiple projects with isolated environments
- **Slash Commands** - Extend agent capabilities with custom commands
- **Remote Access** - Use Tailscale VPN to access from any device

## What's Inside?

This monorepo includes the following packages and apps:

### Apps

- **`web`** - Full-stack application (React + Vite, Fastify backend)
  - Multi-agent chat interface (Claude Code, Codex)
  - File editor with syntax highlighting
  - Terminal emulator with WebSocket
  - Session management with Prisma (SQLite)
  - **Domain-driven functional backend** - business logic organized by domain (project, session, file, git, shell)

### Packages

- **`agent-cli-sdk`** - SDK for AI CLI tools (Claude Code, Codex)
  - Execute agents programmatically with streaming callbacks
  - Load and parse session histories (JSONL)
  - Unified message format across agents

- **`agentcmd-workflows`** - Workflow orchestration library
  - Multi-step workflows with automatic state persistence
  - Git branch management and error handling
  - Pluggable storage adapters (FileStorage)
  - Result pattern for error handling

- **`@repo/ui`** - Shared React components
- **`@repo/eslint-config`** - Shared ESLint configs
- **`@repo/typescript-config`** - Shared TypeScript configs

## Quick Start

### Prerequisites

- **Node.js** >= 22.0.0
- **pnpm** >= 8.0.0
- **Anthropic API Key** (get one at <https://console.anthropic.com/>)

### Installation

```bash
# Clone the repository
git clone https://github.com/jnarowski/agentcmd.git
cd agentcmd

# Install dependencies
pnpm install

# Set up the web app (creates .env, database, etc.)
pnpm dev:setup

# Build packages
pnpm build

# Start development server
cd apps/web
pnpm dev
```

The application will be available at:

- **Frontend**: <http://localhost:5173>
- **Backend API**: <http://localhost:3456>

Default login: `admin` / `password` (change in production!)

### Configuration

Edit `apps/web/.env` to add your API keys:

```bash
ANTHROPIC_API_KEY=your-api-key-here
JWT_SECRET=auto-generated-on-setup
```

## CLI Tool (Production Distribution)

The web app can be distributed as a standalone CLI tool with built-in server and database.

### Installation

```bash
# First-time setup
npx agentcmd install

# Creates ~/.agentcmd/ with:
# - config.json (settings, API keys, secrets)
# - database.db (SQLite database)
# - logs/app.log (application logs)
```

### Usage

```bash
# Start server (uses config.json defaults)
npx agentcmd start

# Access at:
# - Server: http://localhost:3456
# - Inngest UI: http://localhost:8288

# Start with custom ports
npx agentcmd start --port 8080 --inngest-port 9000

# Allow remote access
npx agentcmd start --host 0.0.0.0

# Manage configuration
npx agentcmd config --show           # View config
npx agentcmd config --edit           # Edit in $EDITOR
npx agentcmd config --get port       # Get value
npx agentcmd config --set port=7000  # Set value
```

### Configuration

Config stored in `~/.agentcmd/config.json`:

```json
{
  "port": 3456,
  "inngestPort": 8288,
  "host": "127.0.0.1",
  "logLevel": "info",
  "anthropicApiKey": "",
  "jwtSecret": "auto-generated",
  "allowedOrigins": "http://localhost:3456"
}
```

**Priority:** CLI flags > config.json > defaults

### Rebranding

To rebrand the CLI tool, edit `apps/web/src/cli/utils/constants.ts`:

```typescript
export const CLI_NAME = 'your-tool-name';  // Changes ~/.agentcmd/ to ~/.your-tool-name/
```

## Development Workflow

### Common Commands

**Install Dependencies:**
```bash
# From monorepo root
pnpm install
```
Note: This is now much faster! TypeScript packages no longer build during install.

**Build Everything:**
```bash
# From monorepo root
pnpm build
```

**Build Specific Package:**
```bash
# Build just one workspace package
pnpm --filter @repo/agent-cli-sdk build
pnpm --filter agentcmd-workflows build
```

**Clean Build (from scratch):**
```bash
# Remove all build artifacts
rm -rf packages/*/dist apps/*/dist

# Rebuild everything
pnpm build
```

**Start Web Application:**
```bash
cd apps/web
pnpm dev              # Both client and server
pnpm dev:server       # Backend only
pnpm dev:client       # Frontend only
```

**Run Tests:**
```bash
# From monorepo root
pnpm test

# From specific package
cd packages/agent-cli-sdk
pnpm test
```

**Lint and Type Check:**
```bash
# From monorepo root
pnpm lint
pnpm check-types
```

## Build System

This monorepo uses Turborepo for fast, cached builds:

- **First run**: Builds all packages (~30 seconds)
- **Subsequent runs**: Uses cache (<2 seconds)
- **Automatic**: Packages rebuild when you change source code
- **On-demand**: TypeScript packages don't build during `pnpm install` (exception: Prisma client)

**Note**: If you see "module not found" errors, run `pnpm build`

## Project Structure

```
.
├── apps/
│   ├── web/                    # Main web application
│   │   ├── src/
│   │   │   ├── client/         # React frontend
│   │   │   ├── server/         # Fastify backend
│   │   │   │   ├── domain/     # Domain-driven business logic
│   │   │   │   │   ├── project/    # Project management
│   │   │   │   │   ├── session/    # Agent sessions
│   │   │   │   │   ├── file/       # File operations
│   │   │   │   │   ├── git/        # Git operations
│   │   │   │   │   └── shell/      # Shell/terminal
│   │   │   │   ├── routes/     # HTTP handlers (thin)
│   │   │   │   ├── websocket.ts # WebSocket transport (thin)
│   │   │   │   └── config.ts   # Centralized configuration
│   │   │   └── shared/         # Shared code
│   │   ├── prisma/             # Database schema
│   │   └── scripts/            # Build/setup scripts
│   └── claudecodeui/           # Standalone UI (inactive)
│
├── packages/
│   ├── agent-cli-sdk/          # SDK for AI CLI tools
│   ├── workflow-sdk/           # Workflow orchestration (agentcmd-workflows)
│   ├── ui/                     # Shared UI components
│   ├── eslint-config/          # ESLint configs
│   └── typescript-config/      # TypeScript configs
│
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # pnpm workspace config
└── README.md                   # This file
```

## Publishing Packages

To publish a package to npm:

```bash
cd packages/<package-name>
pnpm ship
```

This will build, test, version bump, commit, tag, and publish automatically.

## Database (Prisma)

The web app uses Prisma with SQLite:

```bash
cd apps/web

# Generate Prisma client (after schema changes)
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Open Prisma Studio (database GUI)
pnpm prisma:studio
```

Database file location: `apps/web/prisma/dev.db`

## Environment Variables

The web app requires environment variables. When you run `pnpm dev:setup` for the first time, a `.env` file is created automatically from `.env.example` with:
- **JWT_SECRET** - Auto-generated secure random value
- **ANTHROPIC_API_KEY** - Placeholder (you need to add your own)
- **VITE_WS_HOST** - Optional WebSocket host override for remote access (see Tailscale setup below)

See `apps/web/.env.example` for all available options.

## Remote Access via Tailscale

You can access the web app running on your local machine from other devices (iPhone, iPad, other computers) using **Tailscale**, a zero-configuration mesh VPN service.

### What is Tailscale?

Tailscale creates a secure, private network between your devices without complex VPN configuration. It's perfect for:

- Accessing your development server from your phone/tablet
- Working on the app from multiple computers
- Sharing access with trusted team members

### Requirements

- A free Tailscale account: <https://tailscale.com/>
- Tailscale installed on both your local machine and remote device(s)

### Setup Instructions

#### 1. Install Tailscale on Your Local Machine

**macOS:**

```bash
brew install tailscale
sudo tailscale up
```

**Linux:**

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

**Windows:**

Download from <https://tailscale.com/download>

#### 2. Install Tailscale on Remote Devices

- **iOS/iPadOS**: Install "Tailscale" from the App Store
- **Android**: Install "Tailscale" from Google Play Store
- **Other computers**: Follow installation instructions at <https://tailscale.com/download>

Sign in to the same Tailscale account on all devices.

#### 3. Get Your Tailscale IP Address

On the machine where you'll run the web app server, find your Tailscale IP:

```bash
# IPv4 address (recommended)
tailscale ip -4

# Example output: 100.101.102.103
```

#### 4. Configure Environment Variables

Edit your `apps/web/.env` file and add the `VITE_WS_HOST` variable:

```bash
# Set to your Tailscale IP address with port 3456
VITE_WS_HOST=100.101.102.103:3456

# Also update ALLOWED_ORIGINS to include your Tailscale IP
ALLOWED_ORIGINS=http://localhost:5173,http://100.101.102.103:5173
```

**Important**: Replace `100.101.102.103` with your actual Tailscale IP address from step 3.

#### 5. Start the Development Server

```bash
cd apps/web
pnpm dev
```

The app will now be accessible at:

- **Local**: <http://localhost:5173>
- **Via Tailscale**: <http://100.101.102.103:5173> (use your Tailscale IP)

#### 6. Access from Remote Devices

On your iPhone, iPad, or other device connected to Tailscale:

1. Open a browser
2. Navigate to: `http://<your-tailscale-ip>:5173`
3. Log in and use the app normally

The WebSocket connection will automatically use your Tailscale IP for real-time features (chat, terminal, file editing).

### Testing the Connection

**Verify Tailscale is working:**

```bash
# On local machine - should see your devices
tailscale status

# On remote device - ping your local machine
ping 100.101.102.103
```

**Check the app is accessible:**

```bash
# From remote device (or local terminal)
curl http://100.101.102.103:5173
```

### Troubleshooting Tailscale

#### WebSocket Connection Fails

**Symptom**: Chat/terminal won't connect, browser shows WebSocket errors

**Solution**:

1. Verify `VITE_WS_HOST` is set correctly in `.env`
2. Check `ALLOWED_ORIGINS` includes your Tailscale IP
3. Restart the dev server: `pnpm dev:kill && pnpm dev`
4. Check browser console for exact WebSocket URL being used

#### Can't Access from Remote Device

**Symptom**: Browser times out, can't load the page

**Solution**:

1. Verify Tailscale is running on both devices: `tailscale status`
2. Check firewall settings aren't blocking ports 3456 (backend) or 5173 (frontend)
3. Try pinging the Tailscale IP: `ping <tailscale-ip>`
4. On macOS, allow Node.js to accept incoming connections in System Preferences > Security & Privacy > Firewall

#### CORS Errors in Browser Console

**Symptom**: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solution**:

Update `ALLOWED_ORIGINS` in `.env`:

```bash
ALLOWED_ORIGINS=http://localhost:5173,http://100.101.102.103:5173
```

Restart the server after changing environment variables.

### Security Considerations

- **Tailscale is secure**: All traffic is encrypted end-to-end using WireGuard
- **Private network only**: Your app is only accessible to devices on your Tailscale network
- **No public exposure**: Unlike ngrok or port forwarding, Tailscale doesn't expose your app to the internet
- **Single-user app**: This app is designed for single-user use; authentication is minimal

### Alternative: Production Deployment

For more permanent remote access, consider:

- Deploy to a cloud server (AWS, DigitalOcean, Fly.io)
- Use proper domain name and SSL certificate
- Set `NODE_ENV=production` and use strong `JWT_SECRET`
- See "Deployment Considerations" in `apps/web/CLAUDE.md`

## Tech Stack

**Frontend:** React 19, Vite, TanStack Query, Zustand, Tailwind CSS v4, shadcn/ui, CodeMirror, xterm.js
**Backend:** Fastify, Prisma (SQLite), JWT, WebSocket, node-pty, Zod
**Architecture:** Domain-driven design, functional programming (pure functions, no classes)
**Build:** Turborepo, pnpm, Bunchee, TypeScript (strict mode)

## Documentation

### General Guides

- **[CLAUDE.md](./CLAUDE.md)** - Monorepo development guide and conventions
- **[apps/web/CLAUDE.md](./apps/web/CLAUDE.md)** - Web app architecture and patterns
- **[packages/agent-cli-sdk/](./packages/agent-cli-sdk/)** - SDK docs (CLAUDE.md + README.md)
- **[packages/workflow-sdk/](./packages/workflow-sdk/)** - Workflow library docs (agentcmd-workflows)

### Architecture Deep Dives

- **[.agent/docs/claude-tool-result-patterns.md](./.agent/docs/claude-tool-result-patterns.md)** - Tool result matching pattern in the web app
  - How `tool_use_id` matching works
  - Data flow from JSONL → enrichment → rendering
  - Guide for implementing new tools
  - Testing patterns and troubleshooting

## Usage Examples

**agent-cli-sdk:**
```typescript
import { execute } from '@repo/agent-cli-sdk';

const result = await execute('claude', {
  prompt: 'Analyze this codebase',
  cliOptions: { model: 'sonnet', permissionMode: 'plan' },
  onMessage: (msg) => console.log(msg)
});
```

**agentcmd-workflows:**
```typescript
import { Workflow, FileStorage, generateWorkflowId } from 'agentcmd-workflows';

const workflow = new Workflow({
  storage: new FileStorage({ workflowId: generateWorkflowId('Feature') })
});

await workflow.executeStep('analyze', {
  fn: async () => ({ analyzed: true })
});
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Module not found | `pnpm build` |
| Database errors | `cd apps/web && pnpm prisma:generate && pnpm prisma:migrate` |
| WebSocket issues | Check logs: `tail -f apps/web/logs/app.log` |
| Port conflicts | `cd apps/web && pnpm dev:kill && pnpm dev` |

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow the code style** - Run `pnpm lint` and `pnpm check-types`
3. **Write tests** for new features
4. **Update documentation** - Keep README and CLAUDE.md files current
5. **Submit a PR** with a clear description of changes

See `CLAUDE.md` and `apps/web/CLAUDE.md` for detailed development guidelines.

### Development Setup

```bash
# Fork and clone your fork
git clone https://github.com/jnarowski/agentcmd.git

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit, push
git push origin feature/your-feature-name

# Open a PR on GitHub
```

## License

MIT License - see [LICENSE](LICENSE) for details
