// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../types/fastify.d.ts" />
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  projectExistsByPath,
  syncFromClaudeProjects,
  listSpecFiles,
} from "@/server/domain/project/services";
import { checkWorkflowSdk } from "@/server/domain/project/services/checkWorkflowSdk";
import { installWorkflowSdk } from "@/server/domain/project/services/installWorkflowSdk";
import { getBranches } from "@/server/domain/git/services";
import { getFileTree, readFile, writeFile } from "@/server/domain/file/services/index";
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
  fileContentQuerySchema,
  fileContentBodySchema,
  hideProjectSchema,
  starProjectSchema,
  projectResponseSchema,
  projectSyncResponseSchema,
  workflowSdkCheckResponseSchema,
  workflowSdkInstallResponseSchema,
} from "@/server/domain/project/schemas";
import {
  fileTreeResponseSchema,
  fileContentResponseSchema,
  fileContentSaveResponseSchema,
} from "@/server/domain/file/schemas";
import { errorResponse } from "@/server/domain/common/schemas";
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@/shared/types/project.types";
import { buildErrorResponse } from "@/server/errors";

// Query schema for projects endpoint
const ProjectsQuerySchema = z.object({
  include: z.enum(['sessions']).optional(),
  sessionLimit: z.coerce.number().min(1).max(100).default(20).optional(),
});

export async function projectRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/projects
   * Get all projects (optionally with sessions)
   */
  fastify.get<{
    Querystring: z.infer<typeof ProjectsQuerySchema>;
  }>(
    "/api/projects",
    {
      preHandler: fastify.authenticate,
      schema: {
        querystring: ProjectsQuerySchema,
        // Note: Response schema validation disabled to support dynamic response shape
        // (with or without sessions based on query params)
      },
    },
    async (request, reply) => {
      const { include, sessionLimit } = request.query;

      const projects = await getAllProjects({
        includeSessions: include === 'sessions',
        sessionLimit,
      });

      return reply.send({ data: projects });
    }
  );

  /**
   * POST /api/projects/sync
   * Sync projects from ~/.claude/projects/ directory
   */
  fastify.post(
    "/api/projects/sync",
    {
      preHandler: fastify.authenticate,
      schema: {
        response: {
          200: projectSyncResponseSchema,
          401: errorResponse,
          500: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const userId = request.user?.id;

        if (!userId) {
          return reply.code(401).send(buildErrorResponse(401, "Unauthorized"));
        }

        const syncResults = await syncFromClaudeProjects({ userId });

        return reply.send({ data: syncResults });
      } catch (error) {
        fastify.log.error({ error }, "Error syncing projects");
        return reply
          .code(500)
          .send(buildErrorResponse(500, "Failed to sync projects"));
      }
    }
  );

  /**
   * GET /api/projects/:id
   * Get a single project by ID
   */
  fastify.get<{
    Params: { id: string };
  }>(
    "/api/projects/:id",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        response: {
          200: projectResponseSchema,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const project = await getProjectById({ id: request.params.id });

      if (!project) {
        return reply
          .code(404)
          .send(buildErrorResponse(404, "Project not found"));
      }

      return reply.send({ data: project });
    }
  );

  /**
   * GET /api/projects/:id/specs
   * List all spec files in .agent/specs/todo/
   */
  fastify.get<{
    Params: { id: string };
  }>(
    "/api/projects/:id/specs",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        response: {
          200: z.object({
            data: z.array(z.string()),
          }),
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const project = await getProjectById({ id: request.params.id });

      if (!project) {
        return reply
          .code(404)
          .send(buildErrorResponse(404, "Project not found"));
      }

      const specFiles = await listSpecFiles({ projectPath: project.path });

      return reply.send({ data: specFiles });
    }
  );

  /**
   * GET /api/projects/:id/branches
   * List all git branches in the project
   */
  fastify.get<{
    Params: { id: string };
  }>(
    "/api/projects/:id/branches",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        response: {
          200: z.object({
            data: z.array(
              z.object({
                name: z.string(),
                current: z.boolean(),
              })
            ),
          }),
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const project = await getProjectById({ id: request.params.id });

      if (!project) {
        return reply
          .code(404)
          .send(buildErrorResponse(404, "Project not found"));
      }

      const branches = await getBranches({ projectPath: project.path });

      return reply.send({ data: branches });
    }
  );

  /**
   * POST /api/projects
   * Create a new project
   */
  fastify.post<{
    Body: CreateProjectRequest;
  }>(
    "/api/projects",
    {
      preHandler: fastify.authenticate,
      schema: {
        body: createProjectSchema,
        response: {
          201: projectResponseSchema,
          409: errorResponse,
        },
      },
    },
    async (request, reply) => {
      // Check if project with same path already exists
      const exists = await projectExistsByPath({ path: request.body.path });
      if (exists) {
        return reply
          .code(409)
          .send(
            buildErrorResponse(
              409,
              "A project with this path already exists",
              "PROJECT_EXISTS"
            )
          );
      }

      const project = await createProject({ data: request.body });
      return reply.code(201).send({ data: project });
    }
  );

  /**
   * PATCH /api/projects/:id
   * Update an existing project
   */
  fastify.patch<{
    Params: { id: string };
    Body: UpdateProjectRequest;
  }>(
    "/api/projects/:id",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        body: updateProjectSchema,
        response: {
          200: projectResponseSchema,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      // Check if body is empty
      if (Object.keys(request.body).length === 0) {
        return reply
          .code(400)
          .send(
            buildErrorResponse(
              400,
              "At least one field must be provided for update",
              "VALIDATION_ERROR"
            )
          );
      }

      const project = await updateProject({ id: request.params.id, data: request.body });

      if (!project) {
        return reply
          .code(404)
          .send(buildErrorResponse(404, "Project not found"));
      }

      return reply.send({ data: project });
    }
  );

  /**
   * DELETE /api/projects/:id
   * Delete a project
   */
  fastify.delete<{
    Params: { id: string };
  }>(
    "/api/projects/:id",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        response: {
          200: projectResponseSchema,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const project = await deleteProject({ id: request.params.id });

      if (!project) {
        return reply
          .code(404)
          .send(buildErrorResponse(404, "Project not found"));
      }

      return reply.send({ data: project });
    }
  );

  /**
   * PATCH /api/projects/:id/hide
   * Toggle project hidden state
   */
  fastify.patch<{
    Params: { id: string };
    Body: { is_hidden: boolean };
  }>(
    "/api/projects/:id/hide",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        body: hideProjectSchema,
        response: {
          200: projectResponseSchema,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const project = await updateProject({
        id: request.params.id,
        data: { is_hidden: request.body.is_hidden }
      });

      if (!project) {
        return reply
          .code(404)
          .send(buildErrorResponse(404, "Project not found"));
      }

      return reply.send({ data: project });
    }
  );

  /**
   * PATCH /api/projects/:id/star
   * Toggle project starred state
   */
  fastify.patch<{
    Params: { id: string };
    Body: { is_starred: boolean };
  }>(
    "/api/projects/:id/star",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        body: starProjectSchema,
        response: {
          200: projectResponseSchema,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const project = await updateProject({
        id: request.params.id,
        data: { is_starred: request.body.is_starred }
      });

      if (!project) {
        return reply
          .code(404)
          .send(buildErrorResponse(404, "Project not found"));
      }

      return reply.send({ data: project });
    }
  );

  /**
   * GET /api/projects/:id/files
   * Get file tree for a project
   */
  fastify.get<{
    Params: { id: string };
  }>(
    "/api/projects/:id/files",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        response: {
          200: fileTreeResponseSchema,
          403: errorResponse,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const files = await getFileTree({ projectId: request.params.id });
        return reply.send({ data: files });
      } catch (error) {
        // Handle specific error messages
        const errorMessage = (error as Error).message;
        if (errorMessage === "Project not found") {
          return reply
            .code(404)
            .send(buildErrorResponse(404, "Project not found"));
        }
        if (errorMessage === "Project path is not accessible") {
          return reply
            .code(403)
            .send(buildErrorResponse(403, "Project path is not accessible"));
        }

        throw error;
      }
    }
  );

  /**
   * GET /api/projects/:id/files/content
   * Get file content
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { path: string };
  }>(
    "/api/projects/:id/files/content",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        querystring: fileContentQuerySchema,
        response: {
          200: fileContentResponseSchema,
          403: errorResponse,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const content = await readFile({
          projectId: request.params.id,
          filePath: request.query.path
        });
        return reply.send({ content });
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (errorMessage === "Project not found") {
          return reply
            .code(404)
            .send(buildErrorResponse(404, "Project not found"));
        }
        if (
          errorMessage === "File not found or not accessible" ||
          errorMessage === "Access denied: File is outside project directory"
        ) {
          return reply.code(403).send(buildErrorResponse(403, errorMessage));
        }

        throw error;
      }
    }
  );

  /**
   * POST /api/projects/:id/files/content
   * Save file content
   */
  fastify.post<{
    Params: { id: string };
    Body: { path: string; content: string };
  }>(
    "/api/projects/:id/files/content",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        body: fileContentBodySchema,
        response: {
          200: fileContentSaveResponseSchema,
          403: errorResponse,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        await writeFile({
          projectId: request.params.id,
          filePath: request.body.path,
          content: request.body.content
        });
        return reply.send({ success: true });
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (errorMessage === "Project not found") {
          return reply
            .code(404)
            .send(buildErrorResponse(404, "Project not found"));
        }
        if (
          errorMessage === "Access denied: File is outside project directory"
        ) {
          return reply.code(403).send(buildErrorResponse(403, errorMessage));
        }

        throw error;
      }
    }
  );

  /**
   * GET /api/projects/:id/readme
   * Get README.md content for a project
   */
  fastify.get<{
    Params: { id: string };
  }>(
    "/api/projects/:id/readme",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        response: {
          200: fileContentResponseSchema,
          403: errorResponse,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        // Try README.md first, then readme.md
        let content: string;
        let readmePath: string;

        try {
          content = await readFile({ projectId: request.params.id, filePath: "README.md" });
          readmePath = "README.md";
        } catch {
          // Try lowercase version
          content = await readFile({ projectId: request.params.id, filePath: "readme.md" });
          readmePath = "readme.md";
        }

        return reply.send({ content, path: readmePath });
      } catch (error) {
        const errorMessage = (error as Error).message;
        if (errorMessage === "Project not found") {
          return reply
            .code(404)
            .send(buildErrorResponse(404, "Project not found"));
        }
        if (
          errorMessage === "File not found or not accessible" ||
          errorMessage === "Access denied: File is outside project directory"
        ) {
          return reply
            .code(404)
            .send(buildErrorResponse(404, "README.md not found"));
        }

        throw error;
      }
    }
  );

  /**
   * GET /api/projects/:id/workflow-sdk/check
   * Check if workflow-sdk is installed in project
   */
  fastify.get<{
    Params: { id: string };
  }>(
    "/api/projects/:id/workflow-sdk/check",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        response: {
          200: workflowSdkCheckResponseSchema,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const project = await getProjectById({ id: request.params.id });

      if (!project) {
        return reply
          .code(404)
          .send(buildErrorResponse(404, "Project not found"));
      }

      const checkResult = await checkWorkflowSdk({ projectPath: project.path });

      return reply.send({ data: checkResult });
    }
  );

  /**
   * POST /api/projects/:id/workflow-sdk/install
   * Install workflow-sdk in project
   */
  fastify.post<{
    Params: { id: string };
  }>(
    "/api/projects/:id/workflow-sdk/install",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
        response: {
          200: workflowSdkInstallResponseSchema,
          404: errorResponse,
        },
      },
    },
    async (request, reply) => {
      const project = await getProjectById({ id: request.params.id });

      if (!project) {
        return reply
          .code(404)
          .send(buildErrorResponse(404, "Project not found"));
      }

      fastify.log.info(
        { projectId: project.id, projectPath: project.path },
        "Installing workflow-sdk"
      );

      const installResult = await installWorkflowSdk({ projectPath: project.path });

      if (!installResult.success) {
        fastify.log.error(
          { projectId: project.id, error: installResult.message },
          "Workflow SDK installation failed"
        );
      }

      return reply.send({ data: installResult });
    }
  );
}
