import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@/shared/prisma";
import { getWorkflowEvents } from "@/server/domain/workflow/services/events/getWorkflowEvents";
import {
  createWorkflowEventSchema,
  getWorkflowEventsQuerySchema,
} from "@/shared/schemas/workflow.schemas";
import { createWorkflowEvent } from "@/server/domain/workflow/services/events/createWorkflowEvent";
import '@/server/plugins/auth';

const runIdSchema = z.object({
  id: z.string().cuid(),
});

export async function workflowEventRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/workflow-runs/:id/events
   * Create an event on a workflow or step
   */
  fastify.post<{
    Params: z.infer<typeof runIdSchema>;
    Body: z.infer<typeof createWorkflowEventSchema>;
  }>(
    "/api/workflow-runs/:id/events",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: runIdSchema,
        body: createWorkflowEventSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user! as { id: string }).id;
      const body = request.body;

      // Get run to extract current phase
      const run = await prisma.workflowRun.findUnique({
        where: { id },
        select: { current_phase: true },
      });

      const event = await createWorkflowEvent({
        workflow_run_id: id,
        event_type: "annotation_added" as const,
        event_data: { message: body.text },
        phase: run?.current_phase,
        created_by_user_id: userId,
        logger: fastify.log,
      });

      return reply.code(201).send({ data: event });
    }
  );

  /**
   * GET /api/workflow-runs/:id/events
   * List events for a workflow run
   */
  fastify.get<{
    Params: z.infer<typeof runIdSchema>;
    Querystring: z.infer<typeof getWorkflowEventsQuerySchema>;
  }>(
    "/api/workflow-runs/:id/events",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: runIdSchema,
        querystring: getWorkflowEventsQuerySchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { step_id } = request.query;

      const events = await getWorkflowEvents(id, step_id);

      return reply.send({ data: events });
    }
  );
}
