import { z } from 'zod'

export const getCommitDiffOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  commitHash: z.string().min(1, 'Commit hash required')
})

export type GetCommitDiffOptions = z.infer<typeof getCommitDiffOptionsSchema>
