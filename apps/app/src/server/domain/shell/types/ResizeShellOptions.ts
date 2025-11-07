import { z } from 'zod'
import type * as pty from 'node-pty'

// Zod schema (runtime validation)
// Note: ptyProcess cannot be validated by Zod, only type-checked
export const resizeShellOptionsSchema = z.object({
  cols: z.number().int().positive(),
  rows: z.number().int().positive()
})

// TypeScript type (compile-time) - includes ptyProcess
export interface ResizeShellOptions {
  ptyProcess: pty.IPty
  cols: number
  rows: number
}
