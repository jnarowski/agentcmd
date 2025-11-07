import { z } from 'zod'

export const checkWorkflowSdkOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required')
})

export type CheckWorkflowSdkOptions = z.infer<typeof checkWorkflowSdkOptionsSchema>
