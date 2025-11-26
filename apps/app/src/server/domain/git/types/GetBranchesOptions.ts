import { z } from 'zod'

export const getBranchesOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required')
})

export type GetBranchesOptions = z.infer<typeof getBranchesOptionsSchema>
