import { z } from 'zod'
import type * as pty from 'node-pty'

// Zod schema (runtime validation)
// Note: ptyProcess cannot be validated by Zod, only type-checked
export const writeToShellOptionsSchema = z.object({
  data: z.string()
})

// TypeScript type (compile-time) - includes ptyProcess
export interface WriteToShellOptions {
  ptyProcess: pty.IPty
  data: string
}
