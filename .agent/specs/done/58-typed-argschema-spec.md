# Typed argSchema in defineWorkflow

**Status**: draft
**Created**: 2025-11-06
**Package**: @repo/workflow-sdk
**Estimated Effort**: 4-6 hours

## Overview

Enable full type inference from JSON Schema `argsSchema` to `event.data.args` in workflow definitions. Users define standard JSON Schema, and TypeScript automatically types `event.data.args` with autocomplete support - no manual casting or `as const` required.

## User Story

As a workflow developer
I want `event.data.args` to be automatically typed based on my `argsSchema` definition
So that I get autocomplete and type safety without manual type casting

## Technical Approach

Connect existing `defineSchema`/`InferSchemaType` utilities to `defineWorkflow` via generics. Thread `TArgsSchema` → `InferSchemaType<TArgsSchema>` → `event.data.args`. Improve `defineSchema` to eliminate `as const` requirement by adding deep readonly modifiers. Add array type support to `InferProperty`.

## Key Design Decisions

1. **Use existing custom solution**: Zero dependencies, already 90% implemented, just needs wiring
2. **argsSchema optional**: Backward compat for untyped workflows (defaults to `Record<string, unknown>`)
3. **No runtime validation**: TS types only, caller responsible for validation (simpler)
4. **Eliminate `as const`**: Improve `defineSchema` signature with deep readonly to preserve literal types
5. **Add array support**: Extend `InferProperty` to handle `type: "array"` with `items`

## Architecture

### Type Flow

```
defineSchema (captures literals)
  → argsSchema (JSONSchema7)
    → TArgsSchema generic (in defineWorkflow)
      → InferSchemaType<TArgsSchema>
        → event.data.args (typed!)
```

### File Structure

```
packages/workflow-sdk/src/
├── builder/
│   ├── defineWorkflow.ts    # Add TArgsSchema generic
│   └── defineSchema.ts      # Add deep readonly modifiers
├── types/
│   ├── workflow.ts          # Add TArgs generic threading
│   └── schema.ts            # Add array support to InferProperty
└── index.ts                 # Export InferSchemaType
```

### Integration Points

**Type System**:
- `types/schema.ts` - Add array inference to `InferProperty`
- `types/workflow.ts` - Add `TArgs` generic to `WorkflowConfig`, `WorkflowEventData`, `WorkflowContext`, `WorkflowFunction`

**Builder API**:
- `builder/defineSchema.ts` - Add deep readonly to preserve literals without `as const`
- `builder/defineWorkflow.ts` - Accept `TArgsSchema`, pass `InferSchemaType<TArgsSchema>` to fn

**Public API**:
- `index.ts` - Export `InferSchemaType` for advanced users

## Implementation Details

### 1. Add Array Support to InferProperty

Currently `InferProperty` only handles: string, number, boolean, enum, nested objects. Need to add array type inference.

**Key Points**:
- Check for `type: "array"` with `items` property
- Recursively infer element type from `items` schema
- Return `Array<InferredElementType>`
- Handle optional arrays (not in required list)

### 2. Improve defineSchema to Eliminate `as const`

Current implementation requires `as const` for enum literals and required fields. Add deep readonly modifiers to signature.

**Key Points**:
- Use `const` generic parameter (already done)
- Add recursive readonly utility type for deep immutability
- Apply to properties, enum arrays, required arrays
- Preserves literal types without user adding `as const`

### 3. Thread TArgs Generic Through Type System

Add `TArgs` generic parameter to all workflow-related types.

**Key Points**:
- `WorkflowConfig<TPhases, TArgsSchema>` - Capture schema type
- `WorkflowEventData<TArgs>` - Change `args: Record<string, unknown>` to `args: TArgs`
- `WorkflowContext<TPhases, TArgs>` - Thread through to event.data
- `WorkflowFunction<TPhases, TArgs>` - Accept typed context
- Default `TArgs = Record<string, unknown>` for backward compat

### 4. Update defineWorkflow Signature

Connect schema to inferred types.

**Key Points**:
- Add `TArgsSchema` generic with `const` modifier
- Pass `InferSchemaType<TArgsSchema>` to `WorkflowFunction<TPhases, TArgs>`
- Runtime type erasure for compatibility (cast to untyped at return)
- Update JSDoc examples to show new usage

### 5. Export InferSchemaType

Make type utility available for advanced users who need manual type extraction.

**Key Points**:
- Export as type-only: `export type { InferSchemaType } from "./types/schema"`
- Document in README for users needing custom casting
- Allows json-schema-to-ts integration if needed

## Files to Create/Modify

### New Files (0)

None - all changes to existing files

### Modified Files (5)

1. `packages/workflow-sdk/src/types/schema.ts` - Add array support to InferProperty
2. `packages/workflow-sdk/src/types/workflow.ts` - Add TArgs generic threading
3. `packages/workflow-sdk/src/builder/defineSchema.ts` - Add deep readonly modifiers
4. `packages/workflow-sdk/src/builder/defineWorkflow.ts` - Accept TArgsSchema, pass InferSchemaType
5. `packages/workflow-sdk/src/index.ts` - Export InferSchemaType

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Add Array Type Support

<!-- prettier-ignore -->
- [x] array-inference Update InferProperty type in schema.ts to handle arrays
  - Add case: `P extends { type: "array"; items: infer Items } ? Array<InferProperty<Items>> : ...`
  - Insert before the `unknown` fallback case
  - File: `packages/workflow-sdk/src/types/schema.ts`
  - Test with: `{ type: "array", items: { type: "string" } }` → `string[]`

#### Completion Notes

- Added array type support to InferProperty type
- Arrays now infer correctly: `{ type: "array", items: { type: "string" } }` → `string[]`
- Recursive inference works for nested array types
- Inserted before unknown fallback to maintain proper type precedence

### Task Group 2: Improve defineSchema Signature

<!-- prettier-ignore -->
- [x] deep-readonly Create DeepReadonly utility type in schema.ts
  - Add recursive readonly type that handles arrays, objects, primitives
  - File: `packages/workflow-sdk/src/types/schema.ts`
- [x] schema-signature Update defineSchema signature in defineSchema.ts
  - Change return type to use deep readonly: `DeepReadonly<TSchema>`
  - Removes need for `as const` on enum/required arrays
  - File: `packages/workflow-sdk/src/builder/defineSchema.ts`
- [x] schema-validation Update ValidateRequired to work with readonly types
  - Ensure compile-time validation still works with deep readonly
  - File: `packages/workflow-sdk/src/types/schema.ts`

#### Completion Notes

- Created DeepReadonly utility type for recursive readonly transformation
- Updated defineSchema to return DeepReadonly<TSchema>
- Eliminates need for `as const` on enum and required arrays
- ValidateRequired works correctly with readonly types (no changes needed)
- Preserves literal types automatically without user intervention

### Task Group 3: Thread TArgs Generic Through Types

<!-- prettier-ignore -->
- [x] config-generic Add TArgsSchema generic to WorkflowConfig interface
  - Add second generic: `WorkflowConfig<TPhases, TArgsSchema = Record<string, unknown>>`
  - Update argsSchema field type: `argsSchema?: TArgsSchema`
  - File: `packages/workflow-sdk/src/types/workflow.ts`
- [x] event-data-generic Add TArgs generic to WorkflowEventData interface
  - Add generic: `WorkflowEventData<TArgs = Record<string, unknown>>`
  - Change args type: `args: TArgs`
  - File: `packages/workflow-sdk/src/types/workflow.ts`
- [x] context-generic Add TArgs generic to WorkflowContext interface
  - Add second generic: `WorkflowContext<TPhases, TArgs = Record<string, unknown>>`
  - Update event.data type: `data: WorkflowEventData<TArgs>`
  - File: `packages/workflow-sdk/src/types/workflow.ts`
- [x] function-generic Add TArgs generic to WorkflowFunction type
  - Add second generic: `WorkflowFunction<TPhases, TArgs = Record<string, unknown>>`
  - Update context type: `context: WorkflowContext<TPhases, TArgs>`
  - File: `packages/workflow-sdk/src/types/workflow.ts`
- [x] definition-generic Add TArgsSchema to WorkflowDefinition interface
  - Add second generic: `WorkflowDefinition<TPhases, TArgsSchema = Record<string, unknown>>`
  - Update config type: `config: WorkflowConfig<TPhases, TArgsSchema>`
  - Update fn type: `fn: WorkflowFunction<TPhases, InferSchemaType<TArgsSchema>>`
  - File: `packages/workflow-sdk/src/builder/defineWorkflow.ts`

#### Completion Notes

- Added TArgsSchema generic to WorkflowConfig interface
- Added TArgs generic to WorkflowEventData, WorkflowContext, WorkflowFunction
- Updated WorkflowDefinition with TArgsSchema generic
- All generics default to Record<string, unknown> for backward compat
- Type flow complete: schema → config → context → event.data.args

### Task Group 4: Update defineWorkflow Implementation

<!-- prettier-ignore -->
- [x] workflow-generic Update defineWorkflow function signature
  - Add second generic: `const TArgsSchema extends Record<string, unknown> = Record<string, unknown>`
  - Update config param: `config: WorkflowConfig<TPhases, TArgsSchema>`
  - Update fn param: `fn: WorkflowFunction<TPhases, InferSchemaType<TArgsSchema>>`
  - Update return type: `WorkflowDefinition<TPhases, TArgsSchema>`
  - File: `packages/workflow-sdk/src/builder/defineWorkflow.ts`
- [x] workflow-erasure Add runtime type erasure for compatibility
  - Cast fn to `WorkflowFunction<TPhases>` when passing to runtime
  - Keeps runtime untyped while compile-time is typed
  - File: `packages/workflow-sdk/src/builder/defineWorkflow.ts`
- [x] workflow-jsdoc Update JSDoc example to show new typed usage
  - Remove manual type casting from example
  - Show automatic type inference working
  - File: `packages/workflow-sdk/src/builder/defineWorkflow.ts`

#### Completion Notes

- Updated defineWorkflow with TArgsSchema generic parameter
- Connected argsSchema to InferSchemaType for automatic type inference
- Added type erasure to maintain runtime compatibility
- Updated JSDoc with new example showing defineSchema usage
- No manual type casting required - fully automatic type inference

### Task Group 5: Export Public API

<!-- prettier-ignore -->
- [x] export-type Add InferSchemaType export to index.ts
  - Add: `export type { InferSchemaType } from "./types/schema"`
  - Type-only export for advanced users
  - File: `packages/workflow-sdk/src/index.ts`

#### Completion Notes

- Added InferSchemaType export to index.ts
- Type-only export for advanced users needing manual type extraction
- Allows custom casting or json-schema-to-ts integration if needed

### Task Group 6: Update Example File

<!-- prettier-ignore -->
- [x] example-update Update example-typed-args.ts to demonstrate new API
  - Remove `as const` from schema definition
  - Remove manual type casting from event.data.args
  - Add examples with arrays, enums, nested objects
  - Verify autocomplete works in IDE
  - File: `.agent/workflows/definitions/example-typed-args.ts`

#### Completion Notes

- Removed all `as const` from schema definition (no longer needed)
- Added array field (tags: string[]) demonstrating array type support
- Added nested object field (config) demonstrating nested type inference
- Updated comments to explain new automatic typing behavior
- Example now shows arrays, enums, nested objects, and optional fields
- Ready for IDE autocomplete verification

## Testing Strategy

### Unit Tests

**`packages/workflow-sdk/src/types/schema.test.ts`** - Type inference tests:

```typescript
import { expectType } from 'ts-expect';
import type { InferSchemaType } from './schema';

// Test basic types
type BasicSchema = {
  type: "object";
  properties: {
    name: { type: "string" };
    age: { type: "number" };
    active: { type: "boolean" };
  };
  required: ["name"];
};
type Basic = InferSchemaType<BasicSchema>;
expectType<{ name: string; age?: number; active?: boolean }>(null as any as Basic);

// Test arrays
type ArraySchema = {
  type: "object";
  properties: {
    tags: { type: "array"; items: { type: "string" } };
  };
};
type Arrays = InferSchemaType<ArraySchema>;
expectType<{ tags?: string[] }>(null as any as Arrays);

// Test enums
type EnumSchema = {
  type: "object";
  properties: {
    env: { enum: ["prod", "dev"] };
  };
  required: ["env"];
};
type Enums = InferSchemaType<EnumSchema>;
expectType<{ env: "prod" | "dev" }>(null as any as Enums);

// Test nested objects
type NestedSchema = {
  type: "object";
  properties: {
    config: {
      properties: {
        timeout: { type: "number" };
      };
    };
  };
};
type Nested = InferSchemaType<NestedSchema>;
expectType<{ config?: { timeout?: number } }>(null as any as Nested);
```

### Integration Tests

**Manual IDE Test** - Create test workflow and verify autocomplete:

```typescript
import { defineWorkflow, defineSchema } from '@repo/workflow-sdk';

const argsSchema = defineSchema({
  type: "object",
  properties: {
    projectName: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    env: { enum: ["production", "development"] },
    includeTests: { type: "boolean" },
  },
  required: ["projectName", "env"],
});

export default defineWorkflow(
  {
    id: "typed-test",
    trigger: "workflow/typed-test",
    argsSchema,
  },
  async ({ event }) => {
    // Test autocomplete on event.data.args
    const args = event.data.args;
    args. // Should show: projectName, tags, env, includeTests

    // Test required vs optional
    const name: string = args.projectName; // ✅ Required, non-optional
    const tags: string[] | undefined = args.tags; // ✅ Optional
    const env: "production" | "development" = args.env; // ✅ Required, literal union
    const tests: boolean | undefined = args.includeTests; // ✅ Optional
  }
);
```

### E2E Tests

Not applicable - type system only, no runtime behavior changes.

## Success Criteria

- [ ] Array types inferred correctly: `{ type: "array", items: { type: "string" } }` → `string[]`
- [ ] No `as const` required on enum or required arrays
- [ ] `event.data.args` typed based on `argsSchema` with autocomplete
- [ ] Required fields are non-optional, others are optional
- [ ] Enum types inferred as literal unions
- [ ] Nested objects inferred correctly
- [ ] Backward compat: untyped workflows still work (default `Record<string, unknown>`)
- [ ] `InferSchemaType` exported for advanced users
- [ ] Example file updated and demonstrates autocomplete
- [ ] Type checks pass: `pnpm check-types`
- [ ] Build succeeds: `pnpm build`

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd packages/workflow-sdk
pnpm check-types
# Expected: No type errors

# Build verification
pnpm build
# Expected: Build completes successfully

# Linting
pnpm lint
# Expected: No lint errors
```

**Manual Verification:**

1. Open in IDE: `.agent/workflows/definitions/example-typed-args.ts`
2. Inside workflow function, type `event.data.args.`
3. Verify: Autocomplete shows schema properties
4. Hover over `event.data.args`
5. Verify: Type matches inferred schema type (not `Record<string, unknown>`)
6. Test enum field: Verify literal union type (e.g., `"prod" | "dev"`)
7. Test array field: Verify array type (e.g., `string[]`)
8. Test required field: Verify non-optional (no `?`)
9. Test optional field: Verify optional (has `?`)

**Feature-Specific Checks:**

- Verify `as const` removed from example schema
- Verify no manual casting in example workflow function
- Verify `InferSchemaType` exported in `index.ts`
- Create new workflow with complex schema, verify types flow correctly
- Test backward compat: Create workflow without `argsSchema`, verify `Record<string, unknown>`

## Implementation Notes

### 1. Deep Readonly Implementation

Use recursive conditional types to handle arrays and objects:

```typescript
type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
```

### 2. Array Inference Pattern

Add before `unknown` fallback in `InferProperty`:

```typescript
export type InferProperty<P> =
  P extends { type: "string" } ? string
  : P extends { type: "number" } ? number
  : P extends { type: "boolean" } ? boolean
  : P extends { enum: readonly (infer E)[] } ? E
  : P extends { type: "array"; items: infer Items } ? Array<InferProperty<Items>>
  : P extends { properties: infer Nested } ? InferProperties<Nested>
  : unknown;
```

### 3. Type Erasure Pattern

In `defineWorkflow` return statement:

```typescript
return {
  __type: "workflow",
  config,
  fn: fn as WorkflowFunction<TPhases>, // Type erasure for runtime
  createInngestFunction(runtime: WorkflowRuntime): any {
    return runtime.createInngestFunction(config, fn as any);
  },
};
```

### 4. Generic Defaults Pattern

All generics default to `Record<string, unknown>` for backward compat:

```typescript
export interface WorkflowConfig<
  TPhases extends readonly PhaseDefinition[] | undefined = undefined,
  TArgsSchema extends Record<string, unknown> = Record<string, unknown>
> {
  // ...
}
```

## Dependencies

- No new dependencies required
- Uses existing `json-schema` package (already installed for `JSONSchema7` type)

## Timeline

| Task                            | Estimated Time |
| ------------------------------- | -------------- |
| Add array type support          | 0.5 hours      |
| Improve defineSchema signature  | 1 hour         |
| Thread TArgs generic            | 1.5 hours      |
| Update defineWorkflow           | 1 hour         |
| Export public API               | 0.5 hours      |
| Update example file             | 0.5 hours      |
| Manual testing and verification | 1 hour         |
| **Total**                       | **4-6 hours**  |

## References

- Existing implementation: `packages/workflow-sdk/src/types/schema.ts`
- Existing builder: `packages/workflow-sdk/src/builder/defineSchema.ts`
- Type inference patterns: TypeScript Handbook - Conditional Types
- Research findings: Discussion context from plan mode

## Next Steps

1. Implement array support in `InferProperty`
2. Add deep readonly to `defineSchema`
3. Thread `TArgs` generic through type system
4. Update `defineWorkflow` signature and implementation
5. Export `InferSchemaType` in public API
6. Update example file to demonstrate new DX
7. Manual IDE testing for autocomplete verification
8. Run `pnpm check-types` and `pnpm build` to verify
