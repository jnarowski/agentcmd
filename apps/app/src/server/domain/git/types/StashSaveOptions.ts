import { z } from 'zod'

export const stashSaveOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  message: z.string().optional()
})

export type StashSaveOptions = z.infer<typeof stashSaveOptionsSchema>
