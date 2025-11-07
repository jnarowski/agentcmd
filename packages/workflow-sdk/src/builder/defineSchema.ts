import type { ValidateRequired, DeepReadonly } from "../types/schema";

/**
 * Define a typed schema with compile-time validation
 *
 * Uses const generic parameter to capture literal types automatically.
 * Deep readonly modifiers preserve literal types without requiring 'as const'.
 * Returns schema unchanged (identity function) - no runtime overhead.
 *
 * @example
 * ```typescript
 * const argsSchema = defineSchema({
 *   type: "object",
 *   properties: {
 *     name: { type: "string" },
 *     priority: { enum: ["high", "low"] },
 *   },
 *   required: ["name"],
 * });
 * ```
 */
export function defineSchema<const TSchema extends Record<string, unknown>>(
  schema: ValidateRequired<TSchema>
): DeepReadonly<TSchema> {
  return schema as unknown as DeepReadonly<TSchema>;
}
