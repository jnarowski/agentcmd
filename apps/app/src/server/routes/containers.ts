// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../types/fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  getContainerById,
  getContainersByProject,
  stopContainer,
  getContainerLogs,
} from "@/server/domain/container";
import { errorResponse } from "@/server/domain/common/schemas";
import { buildErrorResponse } from "@/server/errors";
import { NotFoundError } from "@/server/errors/NotFoundError";

// Schemas
const containerIdSchema = z.object({
  id: z.string().cuid(),
});

const projectIdSchema = z.object({
  projectId: z.string().cuid(),
});

const containerStatusSchema = z.enum(["pending", "starting", "running", "stopped", "failed"]);

const containerQuerySchema = z.object({
  status: containerStatusSchema.optional(),
});

const containerResponseSchema = z.object({
  id: z.string(),
  workflow_run_id: z.string().nullable(),
  project_id: z.string(),
  status: z.string(),
  ports: z.record(z.number()),
  container_ids: z.array(z.string()).nullable(),
  compose_project: z.string().nullable(),
  working_dir: z.string(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  stopped_at: z.string().nullable(),
});

export async function containerRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/projects/:projectId/containers
   * List containers for a project
   */
  fastify.get<{
    Params: z.infer<typeof projectIdSchema>;
    Querystring: z.infer<typeof containerQuerySchema>;
  }>(
    "/api/projects/:projectId/containers",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        querystring: containerQuerySchema,
        response: {
          200: z.object({ data: z.array(containerResponseSchema) }),
          401: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { projectId } = request.params;
        const { status } = request.query;

        const containers = await getContainersByProject({
          projectId,
          status: status as "pending" | "starting" | "running" | "stopped" | "failed" | undefined,
        });

        return reply.send({ data: containers });
      } catch (error) {
        const errorRes = buildErrorResponse(error);
        return reply.status(errorRes.statusCode).send(errorRes);
      }
    }
  );

  /**
   * GET /api/containers/:id
   * Get single container
   */
  fastify.get<{
    Params: z.infer<typeof containerIdSchema>;
  }>(
    "/api/containers/:id",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: containerIdSchema,
        response: {
          200: z.object({ data: containerResponseSchema }),
          401: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const container = await getContainerById({ containerId: id });
        return reply.send({ data: container });
      } catch (error) {
        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: { message: error.message, code: "NOT_FOUND" },
          });
        }
        const errorRes = buildErrorResponse(error);
        return reply.status(errorRes.statusCode).send(errorRes);
      }
    }
  );

  /**
   * DELETE /api/containers/:id
   * Stop container
   */
  fastify.delete<{
    Params: z.infer<typeof containerIdSchema>;
  }>(
    "/api/containers/:id",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: containerIdSchema,
        response: {
          200: z.object({ data: containerResponseSchema }),
          401: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const container = await stopContainer({ containerId: id });
        return reply.send({ data: container });
      } catch (error) {
        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: { message: error.message, code: "NOT_FOUND" },
          });
        }
        const errorRes = buildErrorResponse(error);
        return reply.status(errorRes.statusCode).send(errorRes);
      }
    }
  );

  /**
   * GET /api/containers/:id/logs
   * Get container logs
   */
  fastify.get<{
    Params: z.infer<typeof containerIdSchema>;
  }>(
    "/api/containers/:id/logs",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: containerIdSchema,
        response: {
          200: z.object({ data: z.object({ logs: z.string() }) }),
          401: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const logs = await getContainerLogs({ containerId: id });
        return reply.send({ data: { logs } });
      } catch (error) {
        if (error instanceof NotFoundError) {
          return reply.status(404).send({
            error: { message: error.message, code: "NOT_FOUND" },
          });
        }
        const errorRes = buildErrorResponse(error);
        return reply.status(errorRes.statusCode).send(errorRes);
      }
    }
  );
}
