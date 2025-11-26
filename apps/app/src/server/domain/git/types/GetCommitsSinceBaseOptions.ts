import { z } from 'zod'

export const getCommitsSinceBaseOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  baseBranch: z.string().default('main')
})

export type GetCommitsSinceBaseOptions = z.infer<typeof getCommitsSinceBaseOptionsSchema>
