import { z } from 'zod'
import type { FastifyInstance, FastifyBaseLogger } from 'fastify'

export const executeWorkflowOptionsSchema = z.object({
  runId: z.string().min(1, 'Run ID required'),
  fastify: z.custom<FastifyInstance>(),
  logger: z.custom<FastifyBaseLogger>().optional()
})

export type ExecuteWorkflowOptions = z.infer<typeof executeWorkflowOptionsSchema>
