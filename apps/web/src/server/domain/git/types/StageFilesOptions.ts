import { z } from 'zod'

export const stageFilesOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  files: z.array(z.string()).min(1, 'At least one file required')
})

export type StageFilesOptions = z.infer<typeof stageFilesOptionsSchema>
