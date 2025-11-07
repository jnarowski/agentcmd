import { z } from 'zod'
import type { FastifyBaseLogger } from 'fastify'

export const pauseWorkflowOptionsSchema = z.object({
  runId: z.string().min(1, 'Run ID required'),
  userId: z.string().optional(),
  logger: z.custom<FastifyBaseLogger>().optional()
})

export type PauseWorkflowOptions = z.infer<typeof pauseWorkflowOptionsSchema>
