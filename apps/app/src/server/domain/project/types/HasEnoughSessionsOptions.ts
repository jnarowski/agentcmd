import { z } from 'zod'

// Zod schema (runtime validation)
export const hasEnoughSessionsOptionsSchema = z.object({
  projectName: z.string().min(1, 'Project name required'),
  minSessions: z.number().int().positive().optional()
})

// TypeScript type (compile-time) - single source of truth
export type HasEnoughSessionsOptions = z.infer<typeof hasEnoughSessionsOptionsSchema>
