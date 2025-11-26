import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getWorkflowStepById } from '@/server/domain/workflow/services';
import { NotFoundError } from '@/server/errors';

const stepIdSchema = z.object({
  id: z.string().cuid(),
});

const logTypeSchema = z.object({
  type: z.enum(['input', 'output', 'events', 'summary']),
});

export async function workflowStepRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/workflow-steps/:id
   * Get step details including agent session
   */
  fastify.get<{
    Params: z.infer<typeof stepIdSchema>;
  }>(
    '/api/workflow-steps/:id',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: stepIdSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const step = await getWorkflowStepById(id);

      if (!step) {
        throw new NotFoundError('Workflow step not found');
      }

      return reply.send({ data: step });
    }
  );

  /**
   * GET /api/workflow-steps/:id/logs/:type
   * Stream step logs (STUBBED)
   */
  fastify.get<{
    Params: z.infer<typeof stepIdSchema> & z.infer<typeof logTypeSchema>;
  }>(
    '/api/workflow-steps/:id/logs/:type',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: stepIdSchema.merge(logTypeSchema),
      },
    },
    async (request, reply) => {
      const { id, type } = request.params;

      const step = await getWorkflowStepById(id);

      if (!step) {
        throw new NotFoundError('Workflow step not found');
      }

      // STUB: Log streaming not implemented yet
      return reply.send({
        data: {
          message: 'Log streaming not implemented yet',
          type,
          step_id: id,
        },
      });
    }
  );
}
