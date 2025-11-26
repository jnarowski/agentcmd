import { z } from 'zod'

export const getFileDiffOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  filepath: z.string().min(1, 'File path required')
})

export type GetFileDiffOptions = z.infer<typeof getFileDiffOptionsSchema>
