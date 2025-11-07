import { z } from 'zod'

export const stashListOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required')
})

export type StashListOptions = z.infer<typeof stashListOptionsSchema>
