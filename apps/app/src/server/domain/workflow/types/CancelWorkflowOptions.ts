import { z } from 'zod'
import type { FastifyBaseLogger } from 'fastify'
import type { Inngest } from 'inngest'

export const cancelWorkflowOptionsSchema = z.object({
  runId: z.string().min(1, 'Run ID required'),
  userId: z.string().optional(),
  reason: z.string().optional(),
  logger: z.custom<FastifyBaseLogger>().optional(),
  workflowClient: z.custom<Inngest>()
})

export type CancelWorkflowOptions = z.infer<typeof cancelWorkflowOptionsSchema>
