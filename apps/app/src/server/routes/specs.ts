// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../types/fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getSpecs, clearSpecsCache } from "@/server/domain/spec/services/getSpecs";
import { buildErrorResponse } from "@/server/errors";

const SpecsQuerySchema = z.object({
  project_id: z.string().cuid().optional(),
});

export async function specRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/specs
   * Get all specs and planning sessions, optionally filtered by project
   * Results cached for 30s per user/project
   */
  fastify.get<{
    Querystring: z.infer<typeof SpecsQuerySchema>;
  }>(
    "/api/specs",
    {
      preHandler: fastify.authenticate,
      schema: {
        querystring: SpecsQuerySchema,
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
        "Getting specs and planning sessions"
      );

      const data = await getSpecs(userId, project_id);

      return reply.send({ data });
    }
  );

  /**
   * POST /api/specs/rescan
   * Clear cache and return fresh specs (optionally filtered by project)
   */
  fastify.post<{
    Querystring: z.infer<typeof SpecsQuerySchema>;
  }>(
    "/api/specs/rescan",
    {
      preHandler: fastify.authenticate,
      schema: {
        querystring: SpecsQuerySchema,
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
        "Rescanning specs (clearing cache)"
      );

      clearSpecsCache();
      const data = await getSpecs(userId, project_id);

      return reply.send({ data });
    }
  );
}
