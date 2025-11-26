import { z } from 'zod'

export const mergeBranchOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  sourceBranch: z.string().min(1, 'Source branch required'),
  options: z.object({
    noFf: z.boolean().optional()
  }).optional()
})

export type MergeBranchOptions = z.infer<typeof mergeBranchOptionsSchema>
