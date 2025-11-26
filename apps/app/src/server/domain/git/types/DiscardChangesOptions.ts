import { z } from 'zod'

export const discardChangesOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  files: z.array(z.string()).min(1, 'At least one file required')
})

export type DiscardChangesOptions = z.infer<typeof discardChangesOptionsSchema>
