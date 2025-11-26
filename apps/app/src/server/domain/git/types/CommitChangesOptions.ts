import { z } from 'zod'

export const commitChangesOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  message: z.string().min(1, 'Commit message required'),
})

export type CommitChangesOptions = z.infer<typeof commitChangesOptionsSchema>
