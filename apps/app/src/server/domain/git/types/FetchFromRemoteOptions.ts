import { z } from 'zod'

export const fetchFromRemoteOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  remote: z.string().default('origin')
})

export type FetchFromRemoteOptions = z.infer<typeof fetchFromRemoteOptionsSchema>
