import { z } from 'zod'

export const getWorkflowRunByIdOptionsSchema = z.object({
  id: z.string().min(1, 'Workflow run ID required')
})

export type GetWorkflowRunByIdOptions = z.infer<typeof getWorkflowRunByIdOptionsSchema>
