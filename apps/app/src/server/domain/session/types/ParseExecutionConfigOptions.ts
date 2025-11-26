import { z } from 'zod'

export const parseExecutionConfigOptionsSchema = z.object({
  config: z.unknown()
})

export type ParseExecutionConfigOptions = z.infer<typeof parseExecutionConfigOptionsSchema>
