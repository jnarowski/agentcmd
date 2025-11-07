import { z } from 'zod'

// Zod schema (runtime validation)
export const createShellSessionOptionsSchema = z.object({
  projectId: z.string().min(1, 'Project ID required'),
  userId: z.string().min(1, 'User ID required'),
  cols: z.number().int().positive(),
  rows: z.number().int().positive()
})

// TypeScript type (compile-time) - single source of truth
export type CreateShellSessionOptions = z.infer<typeof createShellSessionOptionsSchema>
