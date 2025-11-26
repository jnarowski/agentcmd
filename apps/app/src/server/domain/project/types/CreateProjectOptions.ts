import { z } from 'zod'

// Zod schema (runtime validation)
// CREATE follows CRUD pattern: { data: {...} }
export const createProjectOptionsSchema = z.object({
  data: z.object({
    name: z.string().min(1, 'Name required'),
    path: z.string().min(1, 'Path required')
  })
})

// TypeScript type (compile-time) - single source of truth
export type CreateProjectOptions = z.infer<typeof createProjectOptionsSchema>
