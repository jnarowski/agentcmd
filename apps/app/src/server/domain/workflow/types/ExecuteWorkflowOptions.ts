import { z } from 'zod'
import type { FastifyBaseLogger } from 'fastify'
import type { Inngest } from 'inngest'

export const executeWorkflowOptionsSchema = z.object({
  runId: z.string().min(1, 'Run ID required'),
  workflowClient: z.custom<Inngest>(),
  logger: z.custom<FastifyBaseLogger>().optional()
})

export type ExecuteWorkflowOptions = z.infer<typeof executeWorkflowOptionsSchema>
