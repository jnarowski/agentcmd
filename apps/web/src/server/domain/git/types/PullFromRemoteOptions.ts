import { z } from 'zod'

export const pullFromRemoteOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  remote: z.string().optional(),
  branch: z.string().optional()
})

export type PullFromRemoteOptions = z.infer<typeof pullFromRemoteOptionsSchema>
