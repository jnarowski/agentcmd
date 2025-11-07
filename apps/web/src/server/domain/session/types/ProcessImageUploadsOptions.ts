import { z } from 'zod'

export const processImageUploadsOptionsSchema = z.object({
  images: z.array(z.string()).optional(),
  projectPath: z.string().min(1, 'Project path required'),
  sessionId: z.string().min(1, 'Session ID required')
})

export type ProcessImageUploadsOptions = z.infer<typeof processImageUploadsOptionsSchema>
