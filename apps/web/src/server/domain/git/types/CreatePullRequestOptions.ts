import { z } from 'zod'

export const createPullRequestOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  title: z.string().min(1, 'PR title required'),
  description: z.string(),
  baseBranch: z.string().default('main')
})

export type CreatePullRequestOptions = z.infer<typeof createPullRequestOptionsSchema>
