import { z } from 'zod'

export const checkGhCliAvailableOptionsSchema = z.object({
  projectPath: z.string().min(1, 'Project path required')
})

export type CheckGhCliAvailableOptions = z.infer<typeof checkGhCliAvailableOptionsSchema>
