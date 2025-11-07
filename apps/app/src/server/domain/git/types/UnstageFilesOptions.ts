import { z } from 'zod'

export const unstageFilesOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  files: z.array(z.string()).min(1, 'At least one file required')
})

export type UnstageFilesOptions = z.infer<typeof unstageFilesOptionsSchema>
