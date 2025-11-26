import { z } from 'zod'

// Zod schema (runtime validation)
// Query modifiers are FLAT (not wrapped in { filters })
export const getAllProjectsOptionsSchema = z.object({
  includeSessions: z.boolean().optional(),
  sessionLimit: z.number().int().positive().optional()
}).optional()

// TypeScript type (compile-time) - single source of truth
export type GetAllProjectsOptions = z.infer<typeof getAllProjectsOptionsSchema>
