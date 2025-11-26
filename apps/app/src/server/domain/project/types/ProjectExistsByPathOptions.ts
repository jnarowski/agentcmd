import { z } from 'zod'

// Zod schema (runtime validation)
export const projectExistsByPathOptionsSchema = z.object({
  path: z.string().min(1, 'Project path required')
})

// TypeScript type (compile-time) - single source of truth
export type ProjectExistsByPathOptions = z.infer<typeof projectExistsByPathOptionsSchema>
