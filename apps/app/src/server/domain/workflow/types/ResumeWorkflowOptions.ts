import { z } from 'zod'
import type { FastifyBaseLogger } from 'fastify'

export const resumeWorkflowOptionsSchema = z.object({
  runId: z.string().min(1, 'Run ID required'),
  userId: z.string().optional(),
  logger: z.custom<FastifyBaseLogger>().optional()
})

export type ResumeWorkflowOptions = z.infer<typeof resumeWorkflowOptionsSchema>
