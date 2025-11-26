// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../types/fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getSpecs, clearSpecsCache } from "@/server/domain/spec/services/getSpecs";
import { moveSpec } from "@/server/domain/spec/services/moveSpec";
import { buildErrorResponse } from "@/server/errors";

const SpecsQuerySchema = z.object({
  project_id: z.string().cuid().optional(),
});

const MoveSpecParamsSchema = z.object({
  projectId: z.string().cuid(),
  specId: z.string(),
});

const MoveSpecBodySchema = z.object({
  targetFolder: z.enum(["backlog", "todo", "done"]),
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

  /**
   * POST /api/projects/:projectId/specs/:specId/move
   * Move a spec to a different workflow folder (backlog, todo, done)
   */
  fastify.post<{
    Params: z.infer<typeof MoveSpecParamsSchema>;
    Body: z.infer<typeof MoveSpecBodySchema>;
  }>(
    "/api/projects/:projectId/specs/:specId/move",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: MoveSpecParamsSchema,
        body: MoveSpecBodySchema,
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      const { projectId, specId } = request.params;
      const { targetFolder } = request.body;

      request.log.info(
        { userId, projectId, specId, targetFolder },
        "Moving spec to folder"
      );

      try {
        // Move spec directly using file operations
        const result = await moveSpec({
          projectId,
          specId,
          targetFolder,
        });

        return reply.send({ success: true, spec: result.spec });
      } catch (error) {
        fastify.log.error({ error }, "Error moving spec");
        const errorMessage = error instanceof Error ? error.message : "Failed to move spec";
        return reply
          .code(500)
          .send(buildErrorResponse(500, errorMessage));
      }
    }
  );
}
