# Generated Files

This directory contains auto-generated code. **DO NOT edit these files manually** - they will be overwritten.

## Files

- `slash-commands.ts` - TypeScript types, argument order constants, and utilities for slash commands
  - Generated from `.claude/commands/*.md` frontmatter
  - Provides type-safe `buildSlashCommand()` function
  - Maintains argument positional order from command definitions

## Regeneration

After editing any `.claude/commands/*.md` file, regenerate types:

```bash
cd packages/workflow-sdk
pnpm gen-slash-types
```

Or from repository root:

```bash
pnpm --filter @repo/workflow-sdk gen-slash-types
```

## Imports

**From workflow definitions:**

```typescript
import { buildSlashCommand } from "../generated/slash-commands";
```

**From external packages:**

```typescript
import { buildSlashCommand } from "agentcmd-workflows";
```
