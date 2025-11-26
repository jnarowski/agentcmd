import { z } from 'zod'

export const getCurrentBranchOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required')
})

export type GetCurrentBranchOptions = z.infer<typeof getCurrentBranchOptionsSchema>
