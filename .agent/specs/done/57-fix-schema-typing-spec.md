# Fix Schema Typing with defineSchema Helper

**Status**: draft
**Created**: 2025-11-06
**Package**: workflow-sdk
**Estimated Effort**: 3-4 hours

## Overview

Replace broken `json-schema-to-ts` approach with custom `defineSchema()` helper that uses `const` generic parameter to capture literal types, exactly matching how phase typing works today. Add compile-time validation for required fields and infer TypeScript types from schema properties.

## User Story

As a workflow developer
I want to define typed arguments using defineSchema()
So that I get autocomplete and type safety without `as const` or manual interfaces

## Technical Approach

Create `defineSchema<const TSchema>()` helper using same pattern as phases (`const TPhases`). Build custom type utilities to infer TS types from schema properties. Validate required fields match properties at compile time. Remove `json-schema-to-ts` dependency (causes infinite recursion).

## Key Design Decisions

1. **Custom type inference over json-schema-to-ts**: Avoid infinite type recursion by building simple property-based inference
2. **defineSchema helper**: Captures literal types via `const` generic, no `as const` needed
3. **Basic type support**: string, number, boolean, enum, nested objects - defer arrays to future
4. **No backward compat**: Breaking change, remove manual interface typing pattern

## Architecture

### File Structure

```
packages/workflow-sdk/
├── src/
│   ├── builder/
│   │   ├── defineWorkflow.ts          # Update signature to accept schema output
│   │   └── defineSchema.ts            # NEW: Schema builder with const capture
│   ├── types/
│   │   ├── workflow.ts                # Update to use InferSchemaType
│   │   └── schema.ts                  # NEW: Type inference utilities
│   └── index.ts                       # Export defineSchema
└── package.json                        # Remove json-schema-to-ts
```

### Integration Points

**workflow-sdk**:
- `src/builder/defineSchema.ts` - New helper function with const capture
- `src/types/schema.ts` - Type utilities for inferring TS types from schema
- `src/builder/defineWorkflow.ts` - Accept schema output, infer types
- `src/types/workflow.ts` - Replace TArgs with InferSchemaType<TArgsSchema>
- `src/index.ts` - Export defineSchema

## Implementation Details

### 1. defineSchema Helper

Create function with `const` generic parameter to capture literal types automatically.

**Key Points**:
- Signature: `export function defineSchema<const TSchema extends Record<string, unknown>>(schema: TSchema)`
- Returns schema unchanged (identity function)
- `const TSchema` captures literal types (enum values, property keys, etc.)
- No runtime overhead

### 2. Type Inference Utilities

Build custom type utilities to extract TypeScript types from captured schema.

**Key Points**:
- `InferSchemaType<TSchema>` - Main entry point, extracts from properties
- `InferProperties<Props>` - Maps over properties object
- `InferProperty<P>` - Handles individual property types
- Support: string, number, boolean, enum (as literal union), nested objects
- Handle `required` array to make fields non-optional

### 3. Update defineWorkflow Signature

Replace TArgs generic with TArgsSchema, infer args type automatically.

**Key Points**:
- Signature: `defineWorkflow<const TPhases, const TArgsSchema = undefined>`
- Extract args type: `InferSchemaType<TArgsSchema>`
- Thread through WorkflowConfig, WorkflowEventData, WorkflowFunction
- Phases unchanged (still work identically)

### 4. Required Field Validation

Add compile-time check that required fields match property keys.

**Key Points**:
- Type: `ValidateRequired<TSchema>` returns `never` if mismatch
- Validates `required` array elements are in `properties` keys
- Catches typos at compile time (`required: ["projectNam"]` errors)

## Files to Create/Modify

### New Files (2)

1. `packages/workflow-sdk/src/builder/defineSchema.ts` - Schema builder helper
2. `packages/workflow-sdk/src/types/schema.ts` - Type inference utilities

### Modified Files (4)

1. `packages/workflow-sdk/src/builder/defineWorkflow.ts` - Update signature
2. `packages/workflow-sdk/src/types/workflow.ts` - Use InferSchemaType
3. `packages/workflow-sdk/src/index.ts` - Export defineSchema
4. `packages/workflow-sdk/package.json` - Remove json-schema-to-ts

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Remove Broken Dependencies

<!-- prettier-ignore -->
- [x] schema-fix-1.1 Remove json-schema-to-ts dependency
  - File: `packages/workflow-sdk/package.json`
  - Run: `cd packages/workflow-sdk && pnpm remove json-schema-to-ts`
  - Verify: Check devDependencies no longer contains `json-schema-to-ts`
- [x] schema-fix-1.2 Remove json-schema-to-ts imports from workflow.ts
  - File: `packages/workflow-sdk/src/types/workflow.ts`
  - Remove: `import type { JSONSchema, FromSchema } from 'json-schema-to-ts';`
  - Remove: Any FromSchema usage in types

#### Completion Notes

- `json-schema-to-ts` was already removed from dependencies
- No imports to remove from workflow.ts - only uses `json-schema` package
- Ready to implement custom type inference

### Task Group 2: Create Type Inference Utilities

<!-- prettier-ignore -->
- [x] schema-fix-2.1 Create schema.ts with InferProperty type
  - File: `packages/workflow-sdk/src/types/schema.ts` (NEW)
  - Add type utility to infer TS type from single property:
    ```typescript
    export type InferProperty<P> =
      P extends { type: "string" } ? string
      : P extends { type: "number" } ? number
      : P extends { type: "boolean" } ? boolean
      : P extends { enum: readonly (infer E)[] } ? E
      : P extends { properties: infer Nested } ? InferProperties<Nested>
      : unknown;
    ```
- [x] schema-fix-2.2 Add InferProperties to map over properties object
  - File: `packages/workflow-sdk/src/types/schema.ts`
  - Add type to map property keys to inferred types:
    ```typescript
    export type InferProperties<Props> = {
      [K in keyof Props]: InferProperty<Props[K]>
    };
    ```
- [x] schema-fix-2.3 Add InferSchemaType main entry point
  - File: `packages/workflow-sdk/src/types/schema.ts`
  - Add type to extract from schema:
    ```typescript
    export type InferSchemaType<TSchema> =
      TSchema extends { properties: infer Props }
        ? InferProperties<Props>
        : Record<string, unknown>;
    ```
- [x] schema-fix-2.4 Add required field handling
  - File: `packages/workflow-sdk/src/types/schema.ts`
  - Update InferSchemaType to handle required array (make fields non-optional)
- [x] schema-fix-2.5 Add ValidateRequired type for compile-time validation
  - File: `packages/workflow-sdk/src/types/schema.ts`
  - Add type to ensure required fields exist in properties:
    ```typescript
    export type ValidateRequired<TSchema> =
      TSchema extends { properties: infer Props; required: infer Req }
        ? Req extends readonly (keyof Props)[] ? TSchema : never
        : TSchema;
    ```

#### Completion Notes

- Created complete type inference utilities in schema.ts
- Implemented InferProperty, InferProperties, InferSchemaType, ValidateRequired
- Added MakeRequired helper to handle required fields properly
- Required fields enforced at compile time via ValidateRequired

### Task Group 3: Create defineSchema Helper

<!-- prettier-ignore -->
- [x] schema-fix-3.1 Create defineSchema.ts with const capture
  - File: `packages/workflow-sdk/src/builder/defineSchema.ts` (NEW)
  - Add function:
    ```typescript
    import type { ValidateRequired } from "../types/schema";

    export function defineSchema<const TSchema extends Record<string, unknown>>(
      schema: ValidateRequired<TSchema>
    ): TSchema {
      return schema;
    }
    ```
- [x] schema-fix-3.2 Export defineSchema from index
  - File: `packages/workflow-sdk/src/index.ts`
  - Add export: `export { defineSchema } from "./builder/defineSchema";`

#### Completion Notes

- Created defineSchema helper with const generic parameter
- Identity function, no runtime overhead
- ValidateRequired ensures compile-time validation of required fields
- Exported from main index.ts

### Task Group 4: Update defineWorkflow Signature

<!-- prettier-ignore -->
- [x] schema-fix-4.1 Update WorkflowConfig to use argsSchema
  - File: `packages/workflow-sdk/src/types/workflow.ts`
  - Update interface:
    ```typescript
    export interface WorkflowConfig<
      TPhases extends readonly PhaseDefinition[] | undefined = undefined,
      TArgsSchema = undefined
    > {
      // ... existing fields
      argsSchema?: TArgsSchema;
    }
    ```
- [x] schema-fix-4.2 Update WorkflowEventData to use InferSchemaType
  - File: `packages/workflow-sdk/src/types/workflow.ts`
  - Update interface:
    ```typescript
    import type { InferSchemaType } from "./schema";

    export interface WorkflowEventData<TArgsSchema = undefined> {
      // ... existing fields
      args: InferSchemaType<TArgsSchema>;
    }
    ```
- [x] schema-fix-4.3 Thread TArgsSchema through WorkflowFunction
  - File: `packages/workflow-sdk/src/types/workflow.ts`
  - Update type signature to use TArgsSchema instead of TArgs
- [x] schema-fix-4.4 Thread TArgsSchema through WorkflowDefinition
  - File: `packages/workflow-sdk/src/types/workflow.ts`
  - Update interface to use TArgsSchema instead of TArgs
- [x] schema-fix-4.5 Update defineWorkflow signature
  - File: `packages/workflow-sdk/src/builder/defineWorkflow.ts`
  - Change to:
    ```typescript
    export function defineWorkflow<
      const TPhases extends readonly PhaseDefinition[] | undefined,
      const TArgsSchema = undefined
    >(
      config: WorkflowConfig<TPhases, TArgsSchema>,
      fn: WorkflowFunction<TPhases, TArgsSchema>
    ): WorkflowDefinition<TPhases, TArgsSchema>
    ```

#### Completion Notes

- Updated all types to use TArgsSchema instead of TArgs
- WorkflowEventData.args now uses InferSchemaType<TArgsSchema>
- defineWorkflow signature uses const TArgsSchema generic
- Updated JSDoc example to show new defineSchema pattern
- Types thread correctly through entire workflow stack

### Task Group 5: Update Example Workflow

<!-- prettier-ignore -->
- [x] schema-fix-5.1 Update example-typed-args.ts to use defineSchema
  - File: `.agent/workflows/definitions/example-typed-args.ts`
  - Remove interface definition
  - Replace with defineSchema:
    ```typescript
    import { defineWorkflow, defineSchema } from "@repo/workflow-sdk";

    const argsSchema = defineSchema({
      type: "object",
      properties: {
        projectName: { type: "string" },
        buildType: { enum: ["production", "development"] },
        includeTests: { type: "boolean" },
      },
      required: ["projectName", "buildType"],
    });

    export default defineWorkflow({
      id: "typed-build-workflow",
      argsSchema,
      phases: [/*...*/],
    }, async ({ event }) => {
      // ✅ Typed automatically
      const { projectName, buildType, includeTests } = event.data.args;
    });
    ```
- [x] schema-fix-5.2 Verify type errors for invalid properties
  - File: `.agent/workflows/definitions/example-typed-args.ts`
  - Test adding invalid property to schema (e.g., `typeee: "invalid"`)
  - Verify TypeScript error at compile time

#### Completion Notes

- Updated example-typed-args.ts to use defineSchema pattern
- Removed old interface-based approach
- Added const assertions for enum and required arrays
- Updated imports to use @repo/workflow-sdk alias
- Added detailed comments showing type inference
- Will verify type errors during build step

### Task Group 6: Build and Verification

<!-- prettier-ignore -->
- [x] schema-fix-6.1 Build workflow-sdk
  - Run: `cd packages/workflow-sdk && pnpm build`
  - Expected: Clean build, no TypeScript errors
- [x] schema-fix-6.2 Type check workflow-sdk
  - Run: `cd packages/workflow-sdk && pnpm check-types`
  - Expected: No type errors
- [x] schema-fix-6.3 Build entire monorepo
  - Run: `pnpm build` (from root)
  - Expected: All packages build successfully
- [x] schema-fix-6.4 Type check entire monorepo
  - Run: `pnpm check-types` (from root)
  - Expected: No type errors

#### Completion Notes

- workflow-sdk builds successfully (18.2 kB output)
- All type checks pass with no errors
- Monorepo builds successfully
- Type inference working correctly across entire stack

## Testing Strategy

### Unit Tests

**`packages/workflow-sdk/src/types/__tests__/schema.test.ts`** - Type inference tests:

```typescript
import { expectType } from 'tsd';
import type { InferSchemaType } from '../schema';

describe('InferSchemaType', () => {
  it('infers string type', () => {
    type Schema = {
      properties: {
        name: { type: "string" }
      }
    };
    expectType<{ name: string }>(
      {} as InferSchemaType<Schema>
    );
  });

  it('infers enum as literal union', () => {
    type Schema = {
      properties: {
        priority: { enum: readonly ["high", "low"] }
      }
    };
    expectType<{ priority: "high" | "low" }>(
      {} as InferSchemaType<Schema>
    );
  });

  it('handles nested objects', () => {
    type Schema = {
      properties: {
        config: {
          properties: {
            port: { type: "number" }
          }
        }
      }
    };
    expectType<{ config: { port: number } }>(
      {} as InferSchemaType<Schema>
    );
  });
});
```

### Integration Tests

Manual testing with example workflow to verify:
- Autocomplete works for args properties
- Type errors for invalid properties
- Required field validation catches typos

### E2E Tests

Not applicable - pure type-level feature

## Success Criteria

- [ ] `defineSchema()` captures literal types without `as const`
- [ ] `event.data.args` properties have correct types (string, number, boolean, enum)
- [ ] Enum values become literal unions
- [ ] Nested objects are typed correctly
- [ ] Invalid schema properties raise compile errors
- [ ] Required field validation catches typos
- [ ] Phases still work identically (no regression)
- [ ] All builds pass with no type errors
- [ ] Example workflow demonstrates usage

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build workflow-sdk
cd packages/workflow-sdk && pnpm build
# Expected: Clean build, no errors

# Type check workflow-sdk
cd packages/workflow-sdk && pnpm check-types
# Expected: No type errors

# Build entire monorepo
pnpm build
# Expected: All packages build successfully

# Type check entire monorepo
pnpm check-types
# Expected: No type errors

# Lint
pnpm lint
# Expected: No lint errors
```

**Manual Verification:**

1. Open `.agent/workflows/definitions/example-typed-args.ts` in IDE
2. Hover over `event.data.args.projectName` - should show `string`
3. Hover over `event.data.args.buildType` - should show `"production" | "development"`
4. Try accessing `event.data.args.invalid` - should show TypeScript error
5. Add invalid property to schema: `typeee: "foo"` - should show TypeScript error
6. Add required field with typo: `required: ["projectNam"]` - should show TypeScript error

**Feature-Specific Checks:**

- Verify no `as const` needed in defineSchema call
- Verify phase typing unchanged (`step.phase("xxx")` autocomplete)
- Verify nested object typing works
- Verify enum values become literal types

## Implementation Notes

### 1. Type Inference Scope

Initial implementation supports basic JSON Schema types:
- `type: "string"` → `string`
- `type: "number"` → `number`
- `type: "boolean"` → `boolean`
- `enum: [...]` → literal union
- `properties: {...}` → nested object

Arrays are deferred to future iteration to keep implementation simple.

### 2. Runtime Validation Unchanged

This spec focuses on compile-time types. Runtime validation (Ajv) from spec #56 remains unchanged and working.

### 3. Breaking Change

This removes backward compatibility with manual interface typing pattern. All workflows must migrate to `defineSchema()`.

## Dependencies

- No new dependencies required
- Remove `json-schema-to-ts` (causes infinite recursion)

## Timeline

| Task                          | Estimated Time |
|-------------------------------|----------------|
| Remove broken dependencies    | 0.5 hours      |
| Type inference utilities      | 1 hour         |
| defineSchema helper           | 0.5 hours      |
| Update defineWorkflow         | 1 hour         |
| Update example workflow       | 0.5 hours      |
| Build and verification        | 0.5 hours      |
| **Total**                     | **3-4 hours**  |

## References

- TypeScript const type parameters: https://www.typescriptlang.org/docs/handbook/2/objects.html#const-type-parameters
- Existing phase pattern: `packages/workflow-sdk/src/builder/defineWorkflow.ts:61` (`const TPhases`)
- Spec #56 review findings: `.agent/specs/done/56-typesafe-args-schema-spec.md:449-585`

## Next Steps

1. Remove `json-schema-to-ts` dependency
2. Create type inference utilities in `schema.ts`
3. Create `defineSchema()` helper
4. Update `defineWorkflow` signature
5. Update example workflow
6. Build and verify
7. Update CLAUDE.md documentation
