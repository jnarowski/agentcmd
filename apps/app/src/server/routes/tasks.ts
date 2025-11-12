// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../types/fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import { getTasks, clearTasksCache } from "@/server/domain/task/services/getTasks";
import { buildErrorResponse } from "@/server/errors";

export async function taskRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/tasks
   * Get all tasks (specs from ALL projects' .agent/specs/todo/ folders) and planning sessions
   * Results cached for 30s per user
   */
  fastify.get(
    "/api/tasks",
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      request.log.info({ userId }, "Getting tasks and planning sessions from all projects");

      const data = await getTasks(userId);

      return reply.send({ data });
    }
  );

  /**
   * POST /api/tasks/rescan
   * Clear cache and return fresh tasks from all projects
   */
  fastify.post(
    "/api/tasks/rescan",
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      request.log.info({ userId }, "Rescanning tasks from all projects (clearing cache)");

      clearTasksCache();
      const data = await getTasks(userId);

      return reply.send({ data });
    }
  );
}
