import Fastify, { FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import { authPlugin } from "@/server/plugins/auth";
import { projectRoutes } from "@/server/routes/projects";
import { sessionRoutes } from "@/server/routes/sessions";
import { authRoutes } from "@/server/routes/auth";
import { gitRoutes } from "@/server/routes/git";
import { slashCommandsRoutes } from "@/server/routes/slash-commands";
import { settingsRoutes } from "@/server/routes/settings";
import { registerWorkflowDefinitionRoutes } from "@/server/routes/workflow-definitions";
import { workflowRoutes } from "@/server/routes/workflows";
import { workflowStepRoutes } from "@/server/routes/workflow-steps";
import { workflowArtifactRoutes } from "@/server/routes/workflow-artifacts";
import { workflowEventRoutes } from "@/server/routes/workflow-events";
import { webhookRoutes } from "@/server/routes/webhooks";
import { createAuthToken } from "./fixtures";

/**
 * Creates a Fastify test app with auth plugin and routes registered
 * - Configures logger to silent mode for clean test output
 * - Registers auth plugin with JWT secret
 * - Registers all route modules
 * - Skips WebSocket routes (not needed for HTTP route testing)
 *
 * @returns Fastify instance ready for testing
 */
export async function createTestApp(): Promise<
  FastifyInstance & { jwt: { sign: (payload: object) => string } }
> {
  const app = Fastify({
    logger: false, // Silent mode for tests
  }).withTypeProvider<ZodTypeProvider>();

  // Set up Zod validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register auth plugin (JWT)
  await app.register(authPlugin);

  // Mock workflow client for tests
  // @ts-expect-error - Mock Inngest client for testing
  app.decorate('workflowClient', {
    send: async () => ({ ids: ['test-inngest-run-id'] }),
  });

  // Register route modules
  await app.register(authRoutes);
  await app.register(projectRoutes);
  await app.register(sessionRoutes);
  await app.register(gitRoutes);
  await app.register(slashCommandsRoutes);
  await app.register(settingsRoutes);
  await app.register(registerWorkflowDefinitionRoutes);
  await app.register(workflowRoutes);
  await app.register(workflowStepRoutes);
  await app.register(workflowArtifactRoutes);
  await app.register(workflowEventRoutes);
  await app.register(webhookRoutes);

  // Note: WebSocket routes are skipped in test app

  return app as FastifyInstance & { jwt: { sign: (payload: object) => string } };
}

/**
 * Gracefully closes Fastify test app
 * @param app - Fastify instance to close
 */
export async function closeTestApp(app: FastifyInstance): Promise<void> {
  await app.close();
}

/**
 * Helper to generate Bearer token header for authenticated requests
 * @param userId - User ID for token
 * @param email - User email for token
 * @param fastify - Fastify instance with JWT plugin
 * @returns Authorization header object
 */
export function injectAuth(
  userId: string,
  email: string,
  fastify: FastifyInstance & { jwt: { sign: (payload: object) => string } }
): { authorization: string } {
  const token = createAuthToken(userId, email, fastify);
  return {
    authorization: `Bearer ${token}`,
  };
}
