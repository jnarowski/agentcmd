import { z } from 'zod'

export const installWorkflowPackageOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required')
})

export type InstallWorkflowPackageOptions = z.infer<typeof installWorkflowPackageOptionsSchema>
