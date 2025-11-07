# @repo/workflow-sdk

Type-safe workflow SDK for Sourceborn workflow engine powered by Inngest.

## Installation

```bash
npm install @repo/workflow-sdk inngest
# or
pnpm add @repo/workflow-sdk inngest
# or
yarn add @repo/workflow-sdk inngest
```

## Quick Start

Create a workflow in your project's `.workflows/` directory:

```typescript
// .workflows/implement-feature.ts
import { defineWorkflow } from "@repo/workflow-sdk";

export default defineWorkflow(
  {
    id: "implement-feature",
    trigger: "workflow/implement-feature",
    phases: ["plan", "implement", "review", "test"],
  },
  async ({ event, step }) => {
    // Phase 1: Planning
    await step.phase("plan", async () => {
      await step.annotation("Starting planning phase");

      await step.agent("analyze-requirements", {
        agent: "claude",
        prompt: "Analyze the requirements and create implementation plan",
      });
    });

    // Phase 2: Implementation
    await step.phase("implement", async () => {
      await step.slash("/implement-spec", ["feature-name"]);

      await step.cli("run-tests", "npm test", {
        cwd: event.data.projectPath,
      });
    });

    // Phase 3: Review
    await step.phase("review", async () => {
      await step.git("create-pr", {
        operation: "pr",
        title: "Implement feature",
        body: "Implementation complete",
      });
    });

    return { success: true };
  }
);
```

## API Reference

### `defineWorkflow(config, fn)`

Define a type-safe workflow.

**Config:**

- `id` (string): Unique workflow identifier
- `trigger` (string): Inngest event trigger (e.g., "workflow/my-workflow")
- `name` (string, optional): Human-readable name
- `description` (string, optional): Workflow description
- `phases` (string[], optional): Workflow phases for UI organization
- `timeout` (number, optional): Global workflow timeout in milliseconds

### Step Methods

#### `step.phase(name, fn, options?)`

Execute a workflow phase with automatic retry logic.

```typescript
await step.phase(
  "implement",
  async () => {
    // Phase logic
  },
  { retries: 3, retryDelay: 5000 }
);
```

**Options:**

- `retries` (number): Number of retry attempts (default: 3)
- `retryDelay` (number): Delay between retries in ms (default: 5000)

#### `step.agent(name, config, options?)`

Execute an AI agent.

```typescript
await step.agent(
  "analyze",
  {
    agent: "claude", // 'claude' | 'codex' | 'gemini'
    prompt: "Analyze the codebase",
    projectPath: "/path/to/project",
    permissionMode: "default",
  },
  { timeout: 1800000 }
);
```

#### `step.slash(command, args?, options?)`

Execute a slash command via agent.

```typescript
await step.slash("/commit-and-push", ["main"]);
```

#### `step.git(name, config, options?)`

Execute git operations.

```typescript
// Commit
await step.git("commit-changes", {
  operation: "commit",
  message: "feat: add new feature",
});

// Create branch
await step.git("create-branch", {
  operation: "branch",
  branch: "feature/new-feature",
});

// Create PR
await step.git("create-pr", {
  operation: "pr",
  title: "New feature",
  body: "Description",
  branch: "feature/new-feature",
  baseBranch: "main",
});
```

#### `step.cli(name, command, config?, options?)`

Execute shell commands.

```typescript
await step.cli(
  "run-tests",
  "npm test",
  {
    cwd: "/path/to/project",
    env: { NODE_ENV: "test" },
  },
  { timeout: 300000 }
);
```

#### `step.artifact(name, config)`

Upload workflow artifacts.

```typescript
// Text content
await step.artifact("results", {
  name: "test-results.txt",
  type: "text",
  content: "All tests passed",
});

// File
await step.artifact("screenshot", {
  name: "screenshot.png",
  type: "image",
  file: "/path/to/screenshot.png",
});

// Directory
await step.artifact("coverage", {
  name: "coverage-reports",
  type: "directory",
  directory: "/path/to/coverage",
  pattern: "**/*.html",
});
```

#### `step.annotation(message)`

Add progress notes to workflow timeline.

```typescript
await step.annotation("Completed analysis phase");
```

### Native Inngest Methods

The SDK extends Inngest's native step methods. All standard Inngest methods are available:

- `step.run()` - Run a function with automatic retry
- `step.sleep()` - Sleep for a duration
- `step.waitForEvent()` - Wait for an external event

See [Inngest documentation](https://www.inngest.com/docs) for full details.

## Timeout Configuration

All step methods that execute long-running operations accept an optional `timeout` parameter:

```typescript
// Default timeouts:
// - agent: 30 minutes (1800000ms)
// - git: 2 minutes (120000ms)
// - cli: 5 minutes (300000ms)

await step.agent("task", config, { timeout: 3600000 }); // 1 hour
await step.cli("build", "npm run build", {}, { timeout: 600000 }); // 10 minutes
```

## License

MIT
