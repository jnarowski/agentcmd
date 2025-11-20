// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../types/fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import type { WebhookEventStatus } from "@prisma/client";
import { z } from "zod";
import {
  createWebhook,
  getWebhookById,
  getWebhooksByProject,
  updateWebhook,
  deleteWebhook,
  activateWebhook,
  pauseWebhook,
  rotateWebhookSecret,
  getWebhookEvents,
  processWebhookEvent,
} from "@/server/domain/webhook/services";
import {
  createWebhookSchema,
  updateWebhookSchema,
} from "@/server/domain/webhook/schemas/webhook.schemas";
import { errorResponse } from "@/server/domain/common/schemas";
import { buildErrorResponse } from "@/server/errors";
import { WEBHOOK_RATE_LIMIT } from "@/server/domain/webhook/constants/webhook.constants";

export async function webhookRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/webhooks/:webhookId/events
   * Public webhook receiver endpoint (no auth, rate limited)
   * Always returns 200 to prevent external services from retrying
   */
  fastify.post(
    "/api/webhooks/:webhookId/events",
    {
      config: {
        rateLimit: {
          max: WEBHOOK_RATE_LIMIT.max,
          timeWindow: WEBHOOK_RATE_LIMIT.timeWindow,
          keyGenerator: (request) => {
            const params = request.params as { webhookId?: string };
            return params.webhookId || "unknown";
          },
        },
      },
    },
    async (request, reply) => {
      const { webhookId } = (request.params || {}) as { webhookId: string };
      const rawPayload = JSON.stringify(request.body);
      const payload = (request.body || {}) as Record<string, unknown>;
      const headers = (request.headers || {}) as Record<string, string>;

      try {
        const result = await processWebhookEvent(
          webhookId,
          rawPayload,
          payload,
          headers,
        );

        return reply.code(200).send({
          success: result.success,
          event_id: result.event_id,
        });
      } catch (error) {
        fastify.log.error({ error, webhookId }, "Webhook processing error");
        // Always return 200 to prevent retries
        return reply.code(200).send({
          success: false,
          error: "Internal error",
        });
      }
    },
  );

  /**
   * POST /api/projects/:projectId/webhooks
   * Create new webhook
   */
  fastify.post(
    "/api/projects/:projectId/webhooks",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: z.object({ projectId: z.string() }),
        body: createWebhookSchema,
        response: {
          201: z.object({
            data: z.object({
              id: z.string(),
              name: z.string(),
              secret: z.string(),
              status: z.string(),
            }),
          }),
          400: errorResponse,
          401: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { projectId } = request.params as { projectId: string };
        const body = request.body as z.infer<typeof createWebhookSchema>;

        const webhook = await createWebhook({
          ...body,
          project_id: projectId,
        });

        return reply.code(201).send({
          data: {
            id: webhook.id,
            name: webhook.name,
            secret: webhook.secret,
            status: webhook.status,
          },
        });
      } catch (error) {
        fastify.log.error({ error }, "Error creating webhook");
        return reply
          .code(500)
          .send(buildErrorResponse(500, "Failed to create webhook"));
      }
    },
  );

  /**
   * GET /api/projects/:projectId/webhooks
   * List all webhooks for a project
   */
  fastify.get(
    "/api/projects/:projectId/webhooks",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: z.object({ projectId: z.string() }),
        response: {
          200: z.object({
            data: z.array(z.any()),
          }),
          401: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { projectId } = request.params as { projectId: string };
        const webhooks = await getWebhooksByProject(projectId);

        return reply.send({ data: webhooks });
      } catch (error) {
        fastify.log.error({ error }, "Error fetching webhooks");
        return reply
          .code(500)
          .send(buildErrorResponse(500, "Failed to fetch webhooks"));
      }
    },
  );

  /**
   * GET /api/webhooks/:webhookId
   * Get webhook by ID
   */
  fastify.get(
    "/api/webhooks/:webhookId",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: z.object({ webhookId: z.string() }),
        response: {
          200: z.object({
            data: z.any(),
          }),
          401: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { webhookId } = request.params as { webhookId: string };
        const webhook = await getWebhookById(webhookId);

        if (!webhook) {
          return reply
            .code(404)
            .send(buildErrorResponse(404, "Webhook not found"));
        }

        return reply.send({ data: webhook });
      } catch (error) {
        fastify.log.error({ error }, "Error fetching webhook");
        return reply
          .code(500)
          .send(buildErrorResponse(500, "Failed to fetch webhook"));
      }
    },
  );

  /**
   * PATCH /api/webhooks/:webhookId
   * Update webhook
   */
  fastify.patch(
    "/api/webhooks/:webhookId",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: z.object({ webhookId: z.string() }),
        body: updateWebhookSchema,
        response: {
          200: z.object({
            data: z.any(),
          }),
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { webhookId } = request.params as { webhookId: string };
        const body = request.body as z.infer<typeof updateWebhookSchema>;

        const webhook = await updateWebhook(webhookId, body);

        return reply.send({ data: webhook });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("not found")
        ) {
          return reply
            .code(404)
            .send(buildErrorResponse(404, "Webhook not found"));
        }

        fastify.log.error({ error }, "Error updating webhook");
        return reply
          .code(500)
          .send(buildErrorResponse(500, "Failed to update webhook"));
      }
    },
  );

  /**
   * DELETE /api/webhooks/:webhookId
   * Delete webhook
   */
  fastify.delete(
    "/api/webhooks/:webhookId",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: z.object({ webhookId: z.string() }),
        response: {
          204: z.null(),
          401: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { webhookId } = request.params as { webhookId: string };
        await deleteWebhook(webhookId);

        return reply.code(204).send();
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("not found")
        ) {
          return reply
            .code(404)
            .send(buildErrorResponse(404, "Webhook not found"));
        }

        fastify.log.error({ error }, "Error deleting webhook");
        return reply
          .code(500)
          .send(buildErrorResponse(500, "Failed to delete webhook"));
      }
    },
  );

  /**
   * POST /api/webhooks/:webhookId/activate
   * Activate webhook
   */
  fastify.post(
    "/api/webhooks/:webhookId/activate",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: z.object({ webhookId: z.string() }),
        response: {
          200: z.object({
            success: z.boolean(),
          }),
          400: errorResponse,
          401: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { webhookId } = request.params as { webhookId: string };
        await activateWebhook(webhookId);

        return reply.send({ success: true });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("not found")
        ) {
          return reply
            .code(404)
            .send(buildErrorResponse(404, "Webhook not found"));
        }

        if (
          error instanceof Error &&
          error.message.includes("workflow_identifier")
        ) {
          return reply
            .code(400)
            .send(
              buildErrorResponse(
                400,
                "Webhook must have workflow_identifier to activate",
              ),
            );
        }

        fastify.log.error({ error }, "Error activating webhook");
        return reply
          .code(500)
          .send(buildErrorResponse(500, "Failed to activate webhook"));
      }
    },
  );

  /**
   * POST /api/webhooks/:webhookId/pause
   * Pause webhook
   */
  fastify.post(
    "/api/webhooks/:webhookId/pause",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: z.object({ webhookId: z.string() }),
        response: {
          200: z.object({
            success: z.boolean(),
          }),
          401: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { webhookId } = request.params as { webhookId: string };
        await pauseWebhook(webhookId);

        return reply.send({ success: true });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("not found")
        ) {
          return reply
            .code(404)
            .send(buildErrorResponse(404, "Webhook not found"));
        }

        fastify.log.error({ error }, "Error pausing webhook");
        return reply
          .code(500)
          .send(buildErrorResponse(500, "Failed to pause webhook"));
      }
    },
  );

  /**
   * POST /api/webhooks/:webhookId/rotate-secret
   * Rotate webhook secret
   */
  fastify.post(
    "/api/webhooks/:webhookId/rotate-secret",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: z.object({ webhookId: z.string() }),
        response: {
          200: z.object({
            secret: z.string(),
          }),
          401: errorResponse,
          404: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { webhookId } = request.params as { webhookId: string };
        const newSecret = await rotateWebhookSecret(webhookId);

        return reply.send({ secret: newSecret });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("not found")
        ) {
          return reply
            .code(404)
            .send(buildErrorResponse(404, "Webhook not found"));
        }

        fastify.log.error({ error }, "Error rotating secret");
        return reply
          .code(500)
          .send(buildErrorResponse(500, "Failed to rotate secret"));
      }
    },
  );

  /**
   * GET /api/webhooks/:webhookId/events
   * Get webhook events with optional filtering and pagination
   */
  fastify.get(
    "/api/webhooks/:webhookId/events",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: z.object({ webhookId: z.string() }),
        querystring: z.object({
          status: z.string().optional(),
          limit: z.coerce.number().optional(),
          offset: z.coerce.number().optional(),
        }),
        response: {
          200: z.object({
            data: z.array(z.any()),
          }),
          401: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { webhookId } = request.params as { webhookId: string };
        const { status, limit, offset } = request.query as {
          status?: string;
          limit?: number;
          offset?: number;
        };

        const events = await getWebhookEvents(webhookId, {
          status: status as WebhookEventStatus | undefined,
          limit,
          offset,
        });

        return reply.send({ data: events });
      } catch (error) {
        fastify.log.error({ error }, "Error fetching webhook events");
        return reply
          .code(500)
          .send(buildErrorResponse(500, "Failed to fetch webhook events"));
      }
    },
  );
}
