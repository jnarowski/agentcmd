import { z } from 'zod'

export const checkWorkflowPackageOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required')
})

export type CheckWorkflowPackageOptions = z.infer<typeof checkWorkflowPackageOptionsSchema>
