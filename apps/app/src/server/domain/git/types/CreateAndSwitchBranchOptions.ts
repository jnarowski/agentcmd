import { z } from 'zod'

export const createAndSwitchBranchOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  branchName: z.string().min(1, 'Branch name required'),
  from: z.string().optional()
})

export type CreateAndSwitchBranchOptions = z.infer<typeof createAndSwitchBranchOptionsSchema>
