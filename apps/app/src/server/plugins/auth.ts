import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyPlugin from "fastify-plugin";
import { prisma } from "@/shared/prisma";
import { JWTPayload } from "@/server/utils/auth";
import { buildErrorResponse } from "@/server/errors";
import { config } from "@/server/config";

async function authPluginFunction(fastify: FastifyInstance) {
  // Register JWT plugin using config service
  await fastify.register(fastifyJwt, {
    secret: config.jwt.secret,
  });

  // Decorate request with authenticate method
  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        const decoded = await request.jwtVerify<JWTPayload>();

        // Verify user still exists in database
        const userId = decoded.userId;
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, is_active: true },
        });

        if (!user || !user.is_active) {
          return reply
            .code(401)
            .send(buildErrorResponse(401, "Invalid token. User not found or inactive."));
        }

        // Attach user to request
        request.user = user;
      } catch (err) {
        fastify.log.debug({ err }, "Authentication failed");
        return reply.code(401).send(buildErrorResponse(401, "Invalid or missing token"));
      }
    }
  );
}

// Export wrapped with fastify-plugin to avoid encapsulation
// Note: Type augmentation for FastifyInstance and FastifyRequest is in src/server/types/fastify.d.ts
export const authPlugin = fastifyPlugin(authPluginFunction, {
  name: "auth-plugin",
});
