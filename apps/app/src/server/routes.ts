import type { FastifyInstance } from "fastify";
import { prisma } from "@/shared/prisma";
import { authRoutes } from "@/server/routes/auth";
import { projectRoutes } from "@/server/routes/projects";
import { sessionRoutes } from "@/server/routes/sessions";
import { slashCommandsRoutes } from "@/server/routes/slash-commands";
import { gitRoutes } from "@/server/routes/git";
import { settingsRoutes } from "@/server/routes/settings";
import { registerWebSocketRoutes } from "@/server/routes/websocket";
import { workflowRoutes } from "@/server/routes/workflows";
import { workflowStepRoutes } from "@/server/routes/workflow-steps";
import { workflowArtifactRoutes } from "@/server/routes/workflow-artifacts";
import { workflowEventRoutes } from "@/server/routes/workflow-events";
import { registerWorkflowDefinitionRoutes } from "@/server/routes/workflow-definitions";

export async function registerRoutes(fastify: FastifyInstance) {
  // Register auth routes
  await fastify.register(authRoutes);

  // Register project routes
  await fastify.register(projectRoutes);

  // Register session routes
  await fastify.register(sessionRoutes);

  // Register slash commands routes
  await fastify.register(slashCommandsRoutes);

  // Register git routes
  await fastify.register(gitRoutes);

  // Register settings routes
  await fastify.register(settingsRoutes);

  // Register workflow routes
  await fastify.register(workflowRoutes);
  await fastify.register(workflowStepRoutes);
  await fastify.register(workflowArtifactRoutes);
  await fastify.register(workflowEventRoutes);
  await fastify.register(registerWorkflowDefinitionRoutes);

  // Register websocket metrics routes
  await fastify.register(registerWebSocketRoutes);

  // Health check endpoint
  fastify.get("/api/health", async (request) => {
    // Test database connectivity
    let databaseConnected = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch (error) {
      // Log warning but don't crash health endpoint
      request.log.warn(
        {
          err: error instanceof Error ? error : new Error(String(error)),
        },
        "Database connectivity check failed"
      );
      databaseConnected = false;
    }

    // Get Inngest process status
    let inngestStatus: "running" | "stopped" | "not_started" = "not_started";
    let inngestPid: number | undefined;
    let inngestUptime: number | undefined;

    try {
      const { getServerHealth } = await import(
        "../cli/commands/start.js"
      );
      const { inngestProcess, serverStartTime } = getServerHealth();

      if (inngestProcess) {
        if (inngestProcess.killed || inngestProcess.exitCode !== null) {
          inngestStatus = "stopped";
        } else {
          inngestStatus = "running";
          inngestPid = inngestProcess.pid;

          if (serverStartTime) {
            inngestUptime = Math.floor(
              (Date.now() - serverStartTime.getTime()) / 1000
            );
          }
        }
      }
    } catch (error) {
      // Ignore error - health endpoint should not fail if CLI module unavailable
      request.log.debug(
        { err: error instanceof Error ? error : new Error(String(error)) },
        "Could not get Inngest process status"
      );
    }

    return {
      status: databaseConnected ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      database: {
        connected: databaseConnected,
      },
      inngest: {
        status: inngestStatus,
        pid: inngestPid,
        uptime: inngestUptime,
      },
      server: {
        uptime: Math.floor(process.uptime()),
      },
      features: {
        aiEnabled: !!process.env.ANTHROPIC_API_KEY,
      },
    };
  });

  // Server status endpoint
  fastify.get("/api/status", async () => {
    return {
      name: "@spectora/agent-workflows-ui",
      version: "0.1.0",
      uptime: process.uptime(),
    };
  });
}
