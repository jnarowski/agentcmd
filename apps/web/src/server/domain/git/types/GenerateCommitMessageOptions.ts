import { z } from 'zod'

export const generateCommitMessageOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  files: z.array(z.string()).min(1, 'At least one file required')
})

export type GenerateCommitMessageOptions = z.infer<typeof generateCommitMessageOptionsSchema>
