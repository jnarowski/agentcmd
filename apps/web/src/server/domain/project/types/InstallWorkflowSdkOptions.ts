import { z } from 'zod'

export const installWorkflowSdkOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required')
})

export type InstallWorkflowSdkOptions = z.infer<typeof installWorkflowSdkOptionsSchema>
