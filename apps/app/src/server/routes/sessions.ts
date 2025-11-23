// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../types/fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import {
  getSessions,
  getSessionsByProject,
  getSessionById,
  getSessionMessages,
  createSession,
  syncProjectSessions,
  bulkGenerateSessionNames,
  updateSession,
  archiveSession,
  unarchiveSession,
} from "@/server/domain/session/services";
import {
  createSessionSchema,
  sessionIdSchema,
  updateSessionSchema,
} from "@/server/domain/session/schemas";
import { projectIdSchema } from "@/server/domain/project/schemas";
import type { CreateSessionRequest } from "@/shared/types/agent-session.types";
import { buildErrorResponse } from "@/server/errors";
import { prisma } from "@/shared/prisma";
import fs from "fs/promises";

export async function sessionRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/sessions
   * Get sessions with optional filters (cross-project or project-scoped)
   */
  fastify.get<{
    Querystring: {
      projectId?: string;
      limit?: string;
      includeArchived?: string;
      orderBy?: 'created_at' | 'updated_at';
      order?: 'asc' | 'desc';
      type?: 'chat' | 'workflow';
    };
  }>(
    "/api/sessions",
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      const {
        projectId,
        limit,
        includeArchived,
        orderBy = 'created_at',
        order = 'desc',
        type,
      } = request.query;

      request.log.info({
        userId,
        projectId,
        limit,
        includeArchived,
        orderBy,
        order,
        type,
      }, 'Getting sessions with filters');

      const sessions = await getSessions({
        userId,
        projectId,
        limit: limit ? parseInt(limit, 10) : undefined,
        includeArchived: includeArchived === 'true',
        orderBy,
        order,
        type,
      });

      return reply.send({ data: sessions });
    }
  );

  /**
   * GET /api/projects/:id/sessions
   * Get all sessions for a project
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { includeArchived?: string };
  }>(
    "/api/projects/:id/sessions",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
      },
    },
    async (request, reply) => {
      // Get userId from JWT token
      const userId = request.user?.id;

      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      const includeArchived = request.query.includeArchived === 'true';

      request.log.info({ projectId: request.params.id, userId, includeArchived }, 'Getting sessions by project');

      const sessions = await getSessionsByProject({
        filters: {
          projectId: request.params.id,
          userId,
          includeArchived,
        },
      });

      return reply.send({ data: sessions });
    }
  );

  /**
   * GET /api/projects/:id/sessions/:sessionId
   * Get single session metadata
   */
  fastify.get<{
    Params: { id: string; sessionId: string };
  }>(
    "/api/projects/:id/sessions/:sessionId",
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      request.log.info({
        sessionId: request.params.sessionId,
        projectId: request.params.id,
        userId
      }, 'Getting session by ID');

      const session = await getSessionById({
        sessionId: request.params.sessionId,
        projectId: request.params.id,
        userId,
      });

      if (!session) {
        return reply.code(404).send(buildErrorResponse(404, "Session not found"));
      }

      return reply.send({ data: session });
    }
  );

  /**
   * GET /api/projects/:id/sessions/:sessionId/messages
   * Get messages for a specific session
   */
  fastify.get<{
    Params: { id: string; sessionId: string };
  }>(
    "/api/projects/:id/sessions/:sessionId/messages",
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      try {
        request.log.info({ sessionId: request.params.sessionId, userId }, 'Getting session messages');

        const messages = await getSessionMessages({
          sessionId: request.params.sessionId,
          userId
        });

        return reply.send({ data: messages });
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        fastify.log.error({
          error: {
            message: err.message,
            stack: err.stack,
            name: err.name
          },
          sessionId: request.params.sessionId,
          projectId: request.params.id,
          userId
        }, 'Error fetching session messages');

        if (
          err.message === "Session not found" ||
          err.message === "Session file not found"
        ) {
          return reply.code(404).send(buildErrorResponse(404, err.message));
        }

        if (err.message === "Unauthorized access to session") {
          return reply.code(401).send(buildErrorResponse(401, "Unauthorized access to session"));
        }

        // Catch all other errors
        return reply.code(500).send(buildErrorResponse(500, err.message || 'Internal server error'));
      }
    }
  );

  /**
   * POST /api/projects/:id/sessions
   * Create a new session
   */
  fastify.post<{
    Params: { id: string };
    Body: CreateSessionRequest;
  }>(
    "/api/projects/:id/sessions",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        body: createSessionSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      request.log.info({
        projectId: request.params.id,
        userId,
        sessionId: request.body.sessionId,
        agent: request.body.agent || 'claude',
        permission_mode: request.body.permission_mode,
      }, 'Creating session');

      const session = await createSession({
        data: {
          projectId: request.params.id,
          userId,
          sessionId: request.body.sessionId,
          agent: request.body.agent,
          permission_mode: request.body.permission_mode,
        },
      });

      request.log.info({ sessionId: session.id, agent: session.agent }, 'Session created successfully');

      return reply.code(201).send({ data: session });
    }
  );

  /**
   * POST /api/projects/:id/sessions/sync
   * Sync sessions from filesystem for a project
   */
  fastify.post<{
    Params: { id: string };
  }>(
    "/api/projects/:id/sessions/sync",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      try {
        request.log.info({ projectId: request.params.id, userId }, 'Syncing project sessions');

        const result = await syncProjectSessions({
          projectId: request.params.id,
          userId
        });

        // Start background naming (fire-and-forget)
        bulkGenerateSessionNames({
          projectId: request.params.id,
          userId,
          logger: request.log,
        }).catch((err) => {
          request.log.error(
            { err, projectId: request.params.id },
            "Background session naming failed (non-critical)"
          );
        });

        return reply.send({ data: result });
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (err.message.includes("Project not found")) {
          return reply.code(404).send(buildErrorResponse(404, "Project not found"));
        }

        throw error;
      }
    }
  );

  /**
   * PATCH /api/sessions/:sessionId
   * Update session (name and/or permission_mode)
   */
  fastify.patch<{
    Params: { sessionId: string };
    Body: { name?: string; permission_mode?: string };
  }>(
    "/api/sessions/:sessionId",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: sessionIdSchema,
        body: updateSessionSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      const { sessionId } = request.params;
      const { name, permission_mode } = request.body;

      request.log.info({ sessionId, userId, name, permission_mode }, 'Updating session');

      // Verify session ownership
      const existingSession = await prisma.agentSession.findFirst({
        where: { id: sessionId, user_id: userId },
      });

      if (!existingSession) {
        return reply.code(404).send(buildErrorResponse(404, "Session not found"));
      }

      const session = await updateSession({
        id: sessionId,
        data: {
          ...(name !== undefined && { name }),
          ...(permission_mode !== undefined && { permission_mode }),
        },
      });

      return reply.send({ data: session });
    }
  );

  /**
   * GET /api/sessions/:sessionId/file
   * Get raw JSONL file content for a session (for debugging)
   */
  fastify.get<{
    Params: { sessionId: string };
  }>(
    "/api/sessions/:sessionId/file",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: sessionIdSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      const { sessionId } = request.params;

      fastify.log.info({ sessionId, userId }, 'Fetching session file content');

      try {
        // Verify session exists and user has access
        const session = await prisma.agentSession.findFirst({
          where: {
            id: sessionId,
            user_id: userId,
          },
        });

        if (!session) {
          return reply.code(404).send(buildErrorResponse(404, "Session not found"));
        }

        // Check if session_path exists
        if (!session.session_path) {
          return reply.code(404).send(buildErrorResponse(404, "Session file path not available (legacy session)"));
        }

        // Read the file content
        const content = await fs.readFile(session.session_path, "utf-8");

        return reply.send({
          data: {
            content,
            path: session.session_path,
          },
        });
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const errCode = 'code' in err ? (err as NodeJS.ErrnoException).code : undefined;
        fastify.log.error({
          error: {
            message: err.message,
            stack: err.stack,
            code: errCode,
          },
          sessionId,
          userId,
        }, 'Error reading session file');

        if (errCode === "ENOENT") {
          return reply.code(404).send(buildErrorResponse(404, "Session file not found on disk"));
        }

        if (errCode === "EACCES") {
          return reply.code(403).send(buildErrorResponse(403, "Permission denied reading session file"));
        }

        return reply.code(500).send(buildErrorResponse(500, err.message || "Internal server error"));
      }
    }
  );

  /**
   * POST /api/sessions/:sessionId/archive
   * Archive a session
   */
  fastify.post<{
    Params: { sessionId: string };
  }>(
    "/api/sessions/:sessionId/archive",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: sessionIdSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      const { sessionId } = request.params;

      request.log.info({ sessionId, userId }, 'Archiving session');

      const session = await archiveSession({
        sessionId,
        userId
      });

      if (!session) {
        return reply.code(404).send(buildErrorResponse(404, "Session not found"));
      }

      return reply.send({ data: session });
    }
  );

  /**
   * POST /api/sessions/:sessionId/unarchive
   * Unarchive a session
   */
  fastify.post<{
    Params: { sessionId: string };
  }>(
    "/api/sessions/:sessionId/unarchive",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: sessionIdSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
      }

      const { sessionId } = request.params;

      request.log.info({ sessionId, userId }, 'Unarchiving session');

      const session = await unarchiveSession({
        sessionId,
        userId
      });

      if (!session) {
        return reply.code(404).send(buildErrorResponse(404, "Session not found"));
      }

      return reply.send({ data: session });
    }
  );
}
