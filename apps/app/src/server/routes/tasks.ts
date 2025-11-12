// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../types/fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getTasks, clearTasksCache } from "@/server/domain/task/services/getTasks";
import { buildErrorResponse } from "@/server/errors";

const TasksQuerySchema = z.object({
  project_id: z.string().cuid().optional(),
});

export async function taskRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/tasks
   * Get all tasks (specs and planning sessions), optionally filtered by project
   * Results cached for 30s per user/project
   */
  fastify.get<{
    Querystring: z.infer<typeof TasksQuerySchema>;
  }>(
    "/api/tasks",
    {
      preHandler: fastify.authenticate,
      schema: {
        querystring: TasksQuerySchema,
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      const { project_id } = request.query;

      request.log.info(
        { userId, projectId: project_id },
        "Getting tasks and planning sessions"
      );

      const data = await getTasks(userId, project_id);

      return reply.send({ data });
    }
  );

  /**
   * POST /api/tasks/rescan
   * Clear cache and return fresh tasks (optionally filtered by project)
   */
  fastify.post<{
    Querystring: z.infer<typeof TasksQuerySchema>;
  }>(
    "/api/tasks/rescan",
    {
      preHandler: fastify.authenticate,
      schema: {
        querystring: TasksQuerySchema,
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      const { project_id } = request.query;

      request.log.info(
        { userId, projectId: project_id },
        "Rescanning tasks (clearing cache)"
      );

      clearTasksCache();
      const data = await getTasks(userId, project_id);

      return reply.send({ data });
    }
  );
}
