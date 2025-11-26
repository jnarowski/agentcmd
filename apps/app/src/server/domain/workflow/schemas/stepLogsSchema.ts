import { z } from 'zod';

/**
 * Query schema for step logs endpoint
 */
export const stepLogsQuerySchema = z.object({
  runId: z.string().cuid(),
  stepId: z.string().min(1),
});

/**
 * Response schema for step logs
 */
export const stepLogsResponseSchema = z.object({
  logs: z.string(),
  path: z.string(),
});

export type StepLogsQuery = z.infer<typeof stepLogsQuerySchema>;
export type StepLogsResponse = z.infer<typeof stepLogsResponseSchema>;
