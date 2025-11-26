import { z } from 'zod'

export const pushToRemoteOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  branch: z.string().min(1, 'Branch name required'),
  remote: z.string().default('origin')
})

export type PushToRemoteOptions = z.infer<typeof pushToRemoteOptionsSchema>
