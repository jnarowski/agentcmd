import { z } from 'zod'
import type { FastifyBaseLogger } from 'fastify'

export const syncFromClaudeProjectsOptionsSchema = z.object({
  userId: z.string().min(1, 'User ID required')
})

export interface SyncFromClaudeProjectsOptions {
  userId: string;
  logger: FastifyBaseLogger;
}
