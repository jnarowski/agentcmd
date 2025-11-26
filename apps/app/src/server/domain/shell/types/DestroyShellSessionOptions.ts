import { z } from 'zod'

// Zod schema (runtime validation)
export const destroyShellSessionOptionsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required')
})

// TypeScript type (compile-time) - single source of truth
export type DestroyShellSessionOptions = z.infer<typeof destroyShellSessionOptionsSchema>
