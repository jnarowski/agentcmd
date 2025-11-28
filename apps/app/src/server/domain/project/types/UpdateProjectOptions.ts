import { z } from 'zod'
import { previewConfigSchema } from '@/server/domain/project/schemas'

// Zod schema (runtime validation)
// UPDATE follows CRUD pattern: { id, data: {...} }
export const updateProjectOptionsSchema = z.object({
  id: z.string().min(1, 'Project ID required'),
  data: z.object({
    name: z.string().min(1).optional(),
    path: z.string().min(1).optional(),
    is_hidden: z.boolean().optional(),
    is_starred: z.boolean().optional(),
    preview_config: previewConfigSchema.optional()
  })
})

// TypeScript type (compile-time) - single source of truth
export type UpdateProjectOptions = z.infer<typeof updateProjectOptionsSchema>
