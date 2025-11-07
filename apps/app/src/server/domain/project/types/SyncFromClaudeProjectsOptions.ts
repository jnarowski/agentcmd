import { z } from 'zod'

export const syncFromClaudeProjectsOptionsSchema = z.object({
  userId: z.string().min(1, 'User ID required')
})

export type SyncFromClaudeProjectsOptions = z.infer<typeof syncFromClaudeProjectsOptionsSchema>
