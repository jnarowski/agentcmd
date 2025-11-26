import { z } from 'zod'
import type * as pty from 'node-pty'

// Zod schema (runtime validation)
// Note: ptyProcess cannot be validated by Zod, only type-checked
export const cleanupShellSessionOptionsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID required')
})

// TypeScript type (compile-time) - includes ptyProcess
export interface CleanupShellSessionOptions {
  ptyProcess: pty.IPty
  sessionId: string
}
