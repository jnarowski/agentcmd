# Contributing to Agent Workflows Monorepo

Thank you for your interest in contributing to Agent Workflows! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 10.0.0
- Git

### Initial Setup

1. Fork the repository on GitHub
2. Clone your fork locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/agentcmd.git
   cd agentcmd
   ```

3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Build all packages:

   ```bash
   pnpm build
   ```

5. Set up the web app (optional, if working on the UI):
   ```bash
   cd apps/web
   pnpm dev:setup
   ```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `feat/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring

### Making Changes

1. Create a new branch from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes and commit them:

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   Use conventional commit messages:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

3. Run tests and linting:

   ```bash
   pnpm check  # Runs lint, type-check, and tests
   ```

4. Push your branch:
   ```bash
   git push origin feat/your-feature-name
   ```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
cd packages/agent-cli-sdk
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run E2E tests (requires Claude CLI installed)
pnpm test:e2e
```

### Running the Web App

```bash
cd apps/web
pnpm dev  # Runs both client and server
```

## Pull Request Process

1. **Update Documentation**: Ensure your changes are documented in README files and CLAUDE.md files where applicable.

2. **Write Tests**: Add or update tests to cover your changes.

3. **Run All Checks**: Before submitting, run:

   ```bash
   pnpm check  # From monorepo root
   ```

4. **Create Pull Request**:
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template with:
     - Description of changes
     - Related issue number (if applicable)
     - Screenshots (for UI changes)
     - Testing steps

5. **Review Process**:
   - Maintainers will review your PR
   - Address any feedback or requested changes
   - Once approved, your PR will be merged

## Coding Standards

### TypeScript

- Use strict type checking
- Avoid `any` types (use `unknown` instead)
- Prefer functional programming over classes
- One function per file in domain services

### File Naming

- **PascalCase** for React components: `LoginForm.tsx`
- **camelCase** for utilities and services: `loadSession.ts`
- **kebab-case** only for shadcn/ui components: `dropdown-menu.tsx`

### Import Conventions

```typescript
// Always use path aliases
import { Component } from "@/client/components/Component";
import { service } from "@/server/domain/project/services/service";

// Never use relative imports
import { Component } from "../../../components/Component"; // ❌ Bad
```

### React Patterns

- Functional components with hooks
- Co-locate component-specific hooks, stores, and utils
- Use Zustand for client state, TanStack Query for server state
- Avoid object dependencies in useEffect (use primitives only)

### Backend Patterns

- Domain-driven architecture (group by domain, not layer)
- Pure functions with explicit parameters
- Routes are thin orchestrators
- No business logic in WebSocket handlers

## Testing Guidelines

### Unit Tests

- Co-locate tests with source files: `file.ts` → `file.test.ts`
- Test public APIs and edge cases
- Use descriptive test names

```typescript
describe("functionName", () => {
  it("should handle expected input correctly", () => {
    // Test implementation
  });

  it("should return null when item not found", () => {
    // Test implementation
  });
});
```

### E2E Tests

- Located in `tests/e2e/` directories
- Test complete workflows
- Mock external dependencies when possible

## Documentation

### Code Comments

- Document complex logic and business rules
- Use JSDoc for public APIs
- Keep comments up-to-date with code changes

### README Updates

When adding features:

- Update relevant README.md files
- Update CLAUDE.md files for AI assistant context
- Add examples and usage instructions

## Community

### Getting Help

- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas

### Reporting Bugs

When reporting bugs, please include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Relevant logs or error messages

### Suggesting Features

For feature requests:

- Check existing issues first
- Describe the use case
- Explain why this feature would be valuable
- Provide examples if possible

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing, feel free to:

- Open a GitHub Discussion
- Open an issue with the "question" label

Thank you for contributing! 🎉
