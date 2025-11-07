import { z } from 'zod'

// Zod schema (runtime validation)
// DELETE follows CRUD pattern: { id }
export const deleteProjectOptionsSchema = z.object({
  id: z.string().min(1, 'Project ID required')
})

// TypeScript type (compile-time) - single source of truth
export type DeleteProjectOptions = z.infer<typeof deleteProjectOptionsSchema>
