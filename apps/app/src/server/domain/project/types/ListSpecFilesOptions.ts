import { z } from 'zod'

export const listSpecFilesOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required')
})

export type ListSpecFilesOptions = z.infer<typeof listSpecFilesOptionsSchema>
