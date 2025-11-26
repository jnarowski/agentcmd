import { z } from 'zod'

export const cleanupSessionImagesOptionsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required')
})

export type CleanupSessionImagesOptions = z.infer<typeof cleanupSessionImagesOptionsSchema>
