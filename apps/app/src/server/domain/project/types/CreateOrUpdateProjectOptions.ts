import { z } from 'zod'

// Zod schema (runtime validation)
// Flat parameters pattern for operations
export const createOrUpdateProjectOptionsSchema = z.object({
  name: z.string().min(1, 'Project name required'),
  path: z.string().min(1, 'Project path required')
})

// TypeScript type (compile-time) - single source of truth
export type CreateOrUpdateProjectOptions = z.infer<typeof createOrUpdateProjectOptionsSchema>
