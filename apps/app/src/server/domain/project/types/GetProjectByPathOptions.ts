import { z } from 'zod'

// Zod schema (runtime validation)
export const getProjectByPathOptionsSchema = z.object({
  path: z.string().min(1, 'Project path required')
})

// TypeScript type (compile-time) - single source of truth
export type GetProjectByPathOptions = z.infer<typeof getProjectByPathOptionsSchema>
