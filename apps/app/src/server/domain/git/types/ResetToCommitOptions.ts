import { z } from 'zod'

export const resetToCommitOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  commitHash: z.string().min(1, 'Commit hash required'),
  mode: z.enum(['soft', 'mixed', 'hard'])
})

export type ResetToCommitOptions = z.infer<typeof resetToCommitOptionsSchema>
