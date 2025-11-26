import { z } from 'zod'

// Zod schema (runtime validation)
export const cleanupUserSessionsOptionsSchema = z.object({
  userId: z.string().min(1, 'User ID required')
})

// TypeScript type (compile-time) - single source of truth
export type CleanupUserSessionOptions = z.infer<typeof cleanupUserSessionsOptionsSchema>
