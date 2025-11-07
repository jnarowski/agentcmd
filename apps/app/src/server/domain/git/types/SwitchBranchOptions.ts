import { z } from 'zod'

export const switchBranchOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  branchName: z.string().min(1, 'Branch name required')
})

export type SwitchBranchOptions = z.infer<typeof switchBranchOptionsSchema>
