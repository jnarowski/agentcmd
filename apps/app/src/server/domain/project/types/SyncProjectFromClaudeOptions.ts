import { z } from 'zod'

// Zod schema (runtime validation)
export const syncProjectFromClaudeOptionsSchema = z.object({
  claudePath: z.string().min(1, 'Claude path required')
})

// TypeScript type (compile-time) - single source of truth
export type SyncProjectFromClaudeOptions = z.infer<typeof syncProjectFromClaudeOptionsSchema>
