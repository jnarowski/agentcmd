import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify';

export const updateWorkflowRunOptionsSchema = z.object({
  runId: z.string().min(1, 'Run ID required'),
  data: z.custom<Prisma.WorkflowRunUpdateInput>(),
  logger: z.custom<FastifyBaseLogger>().optional(),
});

export type UpdateWorkflowRunOptions = z.infer<typeof updateWorkflowRunOptionsSchema>;
