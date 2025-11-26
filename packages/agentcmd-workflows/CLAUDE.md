# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**agentcmd-workflows** - Type-safe workflow SDK for Inngest-powered workflows with AI agents, git operations, and shell commands.

This is a standalone TypeScript library that provides:
- Type-safe workflow definitions with `defineWorkflow()`
- Extended Inngest step methods (agent, git, cli, artifact, ai, annotation)
- JSON Schema-based argument validation with automatic type inference
- Template project structure (slash commands, workflows, specs)
- CLI tool for project initialization and type generation

## Essential Commands

```bash
# Development
pnpm build              # Build with bunchee
pnpm dev                # Watch mode
pnpm clean              # Remove dist/

# Quality
pnpm check-types        # TypeScript validation
pnpm test               # Vitest tests
pnpm test:watch         # Watch mode

# CLI tool testing
node dist/cli.js init [path]                     # Initialize project structure
node dist/cli.js generate-slash-types            # Generate types from .claude/commands/

# Sync templates (before publishing)
pnpm sync:commands      # Copy .claude/commands/ to templates/
pnpm sync:workflows     # Sync workflow definitions to templates/

# Publishing
pnpm ship               # Build, test, version bump, commit, tag, publish
```

## Architecture

### SDK Structure

```
src/
├── builder/                    # Workflow definition API
│   ├── defineWorkflow.ts       # Main workflow builder
│   └── defineSchema.ts         # Type-safe schema builder
│
├── runtime/                    # Runtime adapter interface
│   └── adapter.ts              # WorkflowRuntime interface (implemented by web app)
│
├── types/                      # TypeScript types
│   ├── workflow.ts             # WorkflowConfig, WorkflowContext, WorkflowFunction
│   ├── steps.ts                # Step interfaces (agent, git, cli, etc.)
│   ├── phases.ts               # Phase definitions
│   ├── schema.ts               # JSON Schema type utilities
│   └── slash-commands-internal.ts  # Slash command parsing types
│
├── utils/                      # Utilities
│   ├── parseSlashCommands.ts   # Parse .md files to extract command defs
│   ├── generateSlashCommandTypes.ts  # Generate TypeScript from commands
│   ├── generateCommandResponseTypes.ts  # Generate response types
│   └── initProject.ts          # CLI init implementation
│
├── cli/                        # CLI entry point
│   └── index.ts                # Commander-based CLI (init, generate-slash-types)
│
├── generated/                  # Auto-generated types
│   └── slash-command-types.ts  # Built-in template command types
│
└── index.ts                    # Main exports
```

### Key Concepts

**1. Workflow Definition (Compile Time)**

Users define workflows in `.agent/workflows/definitions/`:

```typescript
import { defineWorkflow } from "agentcmd-workflows";

export default defineWorkflow({
  id: "my-workflow",
  phases: ["plan", "implement"],
}, async ({ event, step }) => {
  await step.phase("plan", async () => {
    await step.agent("analyze", { agent: "claude", prompt: "..." });
  });
});
```

**2. Runtime Hydration (Web App)**

The web app provides `WorkflowRuntime` implementation that injects real step implementations:

```typescript
// Web app side (NOT in this SDK)
const workflowDef = await import(".agent/workflows/definitions/my-workflow.ts");
const inngestFn = workflowDef.default.createInngestFunction(runtimeAdapter);
```

**3. Type Safety Flow**

- `defineSchema()` → captures literal types automatically (no `as const` needed)
- `argsSchema` → passed to `WorkflowConfig<TPhases, TArgsSchema>`
- `InferSchemaType<TArgsSchema>` → infers TypeScript types from JSON Schema
- `event.data.args` → automatically typed based on schema

### Template System

Templates in `templates/` copied during `init`: `.agent/workflows/`, `.agent/specs/`, `.claude/commands/`, `.gitignore` patterns.

**Template sync** (before `pnpm ship`): `pnpm sync:commands`, `pnpm sync:workflows`

### Slash Command Type Generation

**Workflow:**

1. User creates `.claude/commands/my-command.md` with frontmatter:

```markdown
---
name: my-command
args: [featureName, priority]
response: { success: boolean, specFile: string }
---

Command description here
```

2. CLI parses frontmatter:

```typescript
parseSlashCommands(".claude/commands/") → CommandDefinition[]
```

3. Generate TypeScript types:

```typescript
generateSlashCommandTypesCode(commands) → string
```

4. Output: `.agent/generated/slash-commands.ts`

```typescript
export type MyCommandArgs = [featureName: string, priority?: string];
export type MyCommandResponse = { success: boolean; specFile: string };
```

**Built-in template commands** have types in `src/generated/slash-command-types.ts`.

## Type System

### Schema Type Inference

`defineSchema()` uses `const` generics to preserve literal types:

```typescript
const schema = defineSchema({
  type: "object",
  properties: {
    buildType: { enum: ["production", "development"] }, // ✅ Inferred as union
  },
  required: ["buildType"], // ✅ Inferred as tuple
});

type Inferred = InferSchemaType<typeof schema>;
// { buildType: "production" | "development" }
```

**No `as const` required!** The `const` generic parameter captures literal types automatically.

### Phase Type Safety

When `phases` is defined, `step.phase()` only accepts valid phase IDs:

```typescript
defineWorkflow({
  phases: ["plan", "implement", "review"] as const,
}, async ({ step }) => {
  await step.phase("plan", ...);      // ✅ Valid
  await step.phase("invalid", ...);   // ❌ Type error
});
```

### Step Method Overloads

All step methods return promises:

```typescript
// Agent step
const result: AgentStepResult<string> = await step.agent("task", {
  agent: "claude",
  prompt: "...",
});

// With JSON mode
const result: AgentStepResult<MyType> = await step.agent<MyType>("task", {
  agent: "claude",
  prompt: "...",
  json: true, // Extracts and parses JSON from output
});

// AI step (text generation)
const result: AiStepResult<{ text: string }> = await step.ai("generate", {
  prompt: "...",
});

// AI step (structured output)
const result: AiStepResult<MySchema> = await step.ai<MySchema>("generate", {
  prompt: "...",
  schema: myZodSchema,
});
```

## Step Methods

Extended Inngest steps for workflows:

**Native Inngest (passthrough):** `step.run()`, `step.sleep()`, `step.waitForEvent()`

**Workflow-specific:**
- `step.phase()` - Organize steps into phases
- `step.agent()` - Execute AI agent (Claude/Codex/Gemini, 30min timeout)
- `step.git()` - Git operations (commit/branch/pr, 2min timeout)
- `step.cli()` - Shell commands (5min timeout)
- `step.artifact()` - Upload files/directories (5min timeout)
- `step.annotation()` - Progress notes
- `step.ai()` - AI text/structured generation with Zod schema support (5min timeout)

All timeouts configurable. **See README.md for API documentation and examples.**

## CLI Tool

**Installation:**

```bash
# From published package
npx agentcmd-workflows init [path]

# From local development
cd packages/agentcmd-workflows
pnpm build
node dist/cli.js init ../my-project
```

**What `init` does:**

1. Copy `.agent/` structure (workflows, specs, logs)
2. Copy `.claude/commands/` (slash commands)
3. Generate `.agent/generated/slash-commands.ts`
4. Append gitignore patterns to `.gitignore`

**Skips existing files** - safe to run multiple times.

## Testing Patterns

### Unit Tests (Vitest)

```typescript
import { describe, it, expect } from "vitest";
import { parseSlashCommands } from "./parseSlashCommands";

describe("parseSlashCommands", () => {
  it("extracts command name", async () => {
    const commands = await parseSlashCommands("test/fixtures");
    expect(commands[0].name).toBe("generate-spec");
  });
});
```

### Integration Tests (Manual)

```bash
# Test CLI init
rm -rf test-output
node dist/cli.js init test-output
ls test-output/.agent/workflows/definitions

# Test type generation
node dist/cli.js generate-slash-types --input .claude/commands --output test.ts
cat test.ts
```

## Build System

**bunchee** - Zero-config bundler for TypeScript libraries:

```json
{
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./cli": {
      "types": "./dist/cli.d.ts",
      "import": "./dist/cli.js"
    }
  }
}
```

**Outputs:**
- `dist/index.js` - Main SDK exports
- `dist/cli.js` - CLI tool
- `dist/index.d.ts` - Type declarations

**Note:** Uses `type: "module"` (ESM-only package).

## Publishing Workflow

```bash
# Pre-publish checklist:
pnpm sync:commands      # Sync .claude/commands/ from monorepo
pnpm sync:workflows     # Sync workflow definitions
pnpm build              # Build dist/
pnpm test               # Run tests

# Ship (automated):
pnpm ship
# → build + test + version bump + commit + tag + push + npm publish
```

**Version bumping:** Uses `npm version patch` (increments patch version).

**Files included in package:**
- `dist/` - Compiled code
- `bin/` - CLI wrapper script
- `templates/` - Project templates
- `templates/.*` - Hidden files (.agent, .claude)

## Common Patterns

### Closure-based Context

Share context between phases using JavaScript closures:

```typescript
interface MyContext {
  specFile?: string;
  branch?: string;
}

export default defineWorkflow({
  id: "my-workflow",
  phases: ["plan", "implement"],
}, async ({ event, step }) => {
  const ctx: MyContext = {}; // Shared context via closure

  await step.phase("plan", async () => {
    const result = await step.agent("generate-spec", { ... });
    ctx.specFile = result.output; // Store in context
  });

  await step.phase("implement", async () => {
    // Access context from previous phase
    if (!ctx.specFile) throw new Error("Missing spec");
    await step.agent("implement", { prompt: `Use spec: ${ctx.specFile}` });
  });
});
```

### Error Handling

Steps automatically throw on failure. Handle errors at phase level:

```typescript
await step.phase("build", async () => {
  try {
    await step.cli("build", { command: "npm run build" });
  } catch (error) {
    // Log error, create artifact, etc.
    await step.artifact("error-log", {
      name: "build-error.txt",
      type: "text",
      content: String(error),
    });
    throw error; // Re-throw to mark phase as failed
  }
});
```

### Conditional Execution

Use standard JavaScript conditionals:

```typescript
await step.phase("deploy", async () => {
  const buildResult = await step.cli("build", { ... });

  if (buildResult.exitCode === 0) {
    await step.cli("deploy", { command: "npm run deploy" });
  } else {
    await step.annotation("skip-deploy", {
      message: "Skipping deploy due to build failure",
    });
  }
});
```

## Integration with Web App

The web app (`apps/app`) provides the runtime implementation:

**Web app responsibilities:**
1. Load workflow definitions from `.agent/workflows/definitions/`
2. Create `WorkflowRuntime` adapter with step implementations
3. Call `workflowDef.createInngestFunction(runtime)` to hydrate
4. Register hydrated Inngest functions with Inngest client
5. Trigger workflows via `inngest.send()`

**SDK responsibilities:**
1. Provide type-safe workflow definition API
2. Define step method interfaces
3. Provide CLI for project initialization
4. Generate types from slash commands

**Clear separation:** SDK is compile-time API, web app is runtime implementation.

## Troubleshooting

**Types not updating:**
```bash
pnpm clean && pnpm build
```

**Template files missing after init:**
```bash
# Check templates/ exists in SDK
ls packages/agentcmd-workflows/templates

# Re-run sync before testing
pnpm sync:commands && pnpm sync:workflows && pnpm build
```

**Slash command types not generating:**
```bash
# Manual generation
node dist/cli.js generate-slash-types --input .claude/commands --output test.ts

# Check frontmatter format in .md files
head -n 10 .claude/commands/cmd/generate-spec.md
```

**Published package missing files:**
```json
// Check package.json "files" field includes:
"files": ["dist", "bin", "templates/**", "templates/.*"]
```

## Important Notes

- No runtime overhead - `defineSchema()` is identity function
- ESM-only package (`type: "module"`)
- Requires `inngest` as peer dependency
- Built-in template commands use `cmd:` prefix (e.g., `/cmd:generate-spec`)
- Templates synced from monorepo before each publish
- Step implementations are injected at runtime by web app
