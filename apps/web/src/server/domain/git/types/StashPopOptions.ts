import { z } from 'zod'

export const stashPopOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  index: z.number().min(0).optional()
})

export type StashPopOptions = z.infer<typeof stashPopOptionsSchema>
