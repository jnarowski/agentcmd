import { z } from "zod";

/**
 * Spec status enum schema
 *
 * Matches SpecStatus type from spec.types.ts
 */
export const specStatusSchema = z.enum([
  "backlog",
  "draft",
  "in-progress",
  "completed",
  "review"
]);

export type SpecStatus = z.infer<typeof specStatusSchema>;

/**
 * Spec filters query schema
 *
 * Validates query parameters for filtering specs.
 * Supports single status or comma-separated array.
 */
export const specFiltersSchema = z.object({
  status: z.union([
    specStatusSchema,
    z.string().transform((val) => val.split(',').map(s => s.trim()))
  ]).optional(),
});

export type SpecFilters = z.infer<typeof specFiltersSchema>;
