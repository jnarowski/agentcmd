import { z } from 'zod'

// Zod schema (runtime validation)
export const getProjectByIdOptionsSchema = z.object({
  id: z.string().min(1, 'Project ID required')
})

// TypeScript type (compile-time) - single source of truth
export type GetProjectByIdOptions = z.infer<typeof getProjectByIdOptionsSchema>
