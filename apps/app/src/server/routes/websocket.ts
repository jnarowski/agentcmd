import type { FastifyInstance } from "fastify";
import { wsMetrics } from "@/server/websocket/infrastructure/metrics";

/**
 * WebSocket metrics endpoint
 */
export async function registerWebSocketRoutes(
  fastify: FastifyInstance
): Promise<void> {
  fastify.get("/api/websocket/metrics", async (_request, reply) => {
    return reply.send(wsMetrics.getMetrics());
  });
}
