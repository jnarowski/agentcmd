# Agent Workflows UI - CLI Documentation

This document describes the command-line interface (CLI) tool for Agent Workflows UI, which provides easy installation and management of the application.

## Overview

The `agent-workflows-ui` CLI tool simplifies setup and deployment by automating database initialization, directory creation, and configuration file generation.

## Installation

### Install from npm

```bash
# Install globally
npm install -g @repo/web

# Run the install command to set up database and config
agent-workflows-ui install

# (Optional) Edit configuration
vim ~/.agents/agent-workflows-ui-config.json
```

### Run from dist (without installing)

If you've built the application locally, you can run the CLI directly using `node`:

```bash
# Build the application first
pnpm build

# Run CLI commands from monorepo root
node apps/web/dist/cli.js install
node apps/web/dist/cli.js install --force
node apps/web/dist/cli.js --version
node apps/web/dist/cli.js --help

# Or from apps/web directory
cd apps/web
node dist/cli.js install
```

## Commands

### `install`

Initialize the database and create configuration files.

```bash
agent-workflows-ui install [--force]
```

**Options:**

- `--force` - Overwrite existing database if it exists

**What it does:**

1. Creates `~/.agent/` directory (for database)
2. Creates `~/.agents/` directory (for config)
3. Creates SQLite database at `~/.agent/database.db`
4. Applies all Prisma migrations
5. Creates config at `~/.agents/agent-workflows-ui-config.json`

**Output:**

```
✓ Created ~/.agent/ directory
✓ Created database at ~/.agent/database.db
✓ Applied database migrations
✓ Created config at ~/.agents/agent-workflows-ui-config.json

Next steps:
  1. (Optional) Edit ~/.agents/agent-workflows-ui-config.json to customize ports
  2. Run: agent-workflows-ui start

Default configuration:
  UI Port:     5173
  Server Port: 3456
  Database:    ~/.agent/database.db
```

### `start` (planned)

Start the application server.

```bash
agent-workflows-ui start
```

This command is planned for future implementation. Currently, use the manual start method described below.

### `--version`

Display the CLI version.

```bash
agent-workflows-ui --version
```

### `--help`

Display help information.

```bash
agent-workflows-ui --help
```

## Configuration

The CLI creates a configuration file at `~/.agents/agent-workflows-ui-config.json`.

### Configuration File Structure

```json
{
  "uiPort": 5173,
  "serverPort": 3456,
  "dbPath": "~/.agent/database.db",
  "logLevel": "info"
}
```

### Configuration Options

| Option       | Type   | Default                   | Description                                                        |
| ------------ | ------ | ------------------------- | ------------------------------------------------------------------ |
| `uiPort`     | number | `5173`                    | Port for Vite dev server                                           |
| `serverPort` | number | `3456`                    | Port for Fastify backend                                           |
| `dbPath`     | string | `~/.agent/database.db`    | Path to SQLite database (tilde expands to home directory)          |
| `logLevel`   | string | `info`                    | Logging level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |

### Editing Configuration

```bash
# Edit with your preferred editor
vim ~/.agents/agent-workflows-ui-config.json

# Or
nano ~/.agents/agent-workflows-ui-config.json

# Example: Change ports
{
  "uiPort": 3000,
  "serverPort": 8080,
  "dbPath": "~/.agent/database.db",
  "logLevel": "debug"
}
```

## Files Created by CLI

### Database Directory

- **Location**: `~/.agent/`
- **Contents**: `database.db` (SQLite database file)

### Configuration Directory

- **Location**: `~/.agents/`
- **Contents**: `agent-workflows-ui-config.json` (configuration file)

## Manual Start (Until `start` Command Implemented)

After running `agent-workflows-ui install`, start the application manually:

### Development Mode

```bash
# From the apps/web directory
pnpm dev
```

### Production Mode

```bash
# 1. Set production environment variables
export NODE_ENV=production
export JWT_SECRET=$(openssl rand -base64 32)
export DATABASE_URL="file:$HOME/.agent/database.db"

# 2. Build the application (if not already built)
pnpm build

# 3. Start the server
node dist/server/index.js
```

The server will:
- Serve the API on port 3456 (or configured `serverPort`)
- Serve the frontend from `dist/client/`

## Troubleshooting

### Database Already Exists Error

**Problem**: Running `agent-workflows-ui install` shows error about existing database.

**Solution**: Use the `--force` flag to overwrite:

```bash
agent-workflows-ui install --force
```

### Command Not Found

**Problem**: `agent-workflows-ui: command not found`

**Solution**: Ensure the package is installed globally:

```bash
# Check if installed
npm list -g @repo/web

# If not, install it
npm install -g @repo/web
```

### Permission Denied

**Problem**: Cannot create directories or database.

**Solution**: Ensure you have write permissions to home directory:

```bash
# Check permissions
ls -la ~/

# If needed, fix permissions
chmod 755 ~/.agent ~/.agents
```

### Prisma Migration Fails

**Problem**: Database migrations fail during install.

**Solution**:

1. Check that Prisma schema exists in `dist/prisma/schema.prisma`
2. Ensure you have write permissions to the database directory
3. Try removing the database and running install again:

```bash
rm -rf ~/.agent ~/.agents
agent-workflows-ui install
```

### CLI Version Shows 0.0.0

**Problem**: Running `agent-workflows-ui --version` shows `0.0.0`.

**Solution**: This is expected if `package.json` has version `0.0.0`. Update the version in `apps/web/package.json` before building.


## Environment Variables

The CLI respects the following environment variables:

| Variable       | Description                                 | Default              |
| -------------- | ------------------------------------------- | -------------------- |
| `DATABASE_URL` | SQLite database URL (set during migration)  | From config `dbPath` |
| `NODE_ENV`     | Node environment                            | `development`        |

The `install` command automatically sets `DATABASE_URL` when running Prisma migrations.

## Security Considerations

### Database Location

The default database location (`~/.agent/database.db`) is in the user's home directory:
- Only accessible by the current user
- Not shared across users
- Protected by OS file permissions

### Configuration File

The config file (`~/.agents/agent-workflows-ui-config.json`) contains:
- ✅ Safe: Port numbers, log levels, file paths
- ❌ No secrets: Does not contain API keys, passwords, or tokens

Secrets should be stored in `.env` files or environment variables, not in the config file.

### Path Traversal Protection

The CLI validates paths to prevent directory traversal attacks:
- Tilde (`~`) expansion only at the start of paths
- Relative paths are resolved safely
- Parent directory references (`..`) are not allowed in user input

## Uninstallation

To completely remove the CLI and its files:

```bash
# 1. Uninstall the global package
npm uninstall -g @repo/web

# 2. Remove database and config
rm -rf ~/.agent ~/.agents
```

## Future Enhancements

Planned features for the CLI:

- [ ] `start` command - Start the application server
- [ ] `stop` command - Stop the application server
- [ ] `status` command - Check if server is running
- [ ] `logs` command - View application logs
- [ ] `migrate` command - Run database migrations manually
- [ ] `backup` command - Backup database and config
- [ ] `restore` command - Restore from backup
- [ ] `uninstall` command - Clean removal of all files
- [ ] Interactive installation with prompts for custom paths
- [ ] Config validation on load
- [ ] Support for multiple profiles/environments

## Reference

For more information, see:

- [Main README](./README.md) - Application documentation
- [CLAUDE.md](./CLAUDE.md) - Development guidelines
- [Prisma Documentation](https://www.prisma.io/docs) - Database migrations
- [Commander.js Documentation](https://github.com/tj/commander.js) - CLI framework
