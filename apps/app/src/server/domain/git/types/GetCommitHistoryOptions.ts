import { z } from 'zod'

export const getCommitHistoryOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required'),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0)
})

export type GetCommitHistoryOptions = z.infer<typeof getCommitHistoryOptionsSchema>
