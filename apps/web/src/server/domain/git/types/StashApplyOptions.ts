import { z } from 'zod'

export const stashApplyOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  index: z.number().min(0).optional()
})

export type StashApplyOptions = z.infer<typeof stashApplyOptionsSchema>
