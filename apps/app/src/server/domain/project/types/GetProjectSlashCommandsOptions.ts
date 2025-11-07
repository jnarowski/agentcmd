import { z } from 'zod'

// Zod schema (runtime validation)
export const getProjectSlashCommandsOptionsSchema = z.object({
  projectId: z.string().min(1, 'Project ID required')
})

// TypeScript type (compile-time) - single source of truth
export type GetProjectSlashCommandsOptions = z.infer<typeof getProjectSlashCommandsOptionsSchema>
