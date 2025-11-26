import { z } from 'zod'

export const getGitStatusOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required')
})

export type GetGitStatusOptions = z.infer<typeof getGitStatusOptionsSchema>
