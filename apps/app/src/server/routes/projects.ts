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
} from "@/server/domain/project/services";
import { getAvailableSpecTypes } from "@/server/domain/workflow/services/getAvailableSpecTypes";
import { installWorkflowPackage } from "@/server/domain/project/services/installWorkflowPackage";
import { getBranches } from "@/server/domain/git/services";
import { getFileTree, readFile, writeFile } from "@/server/domain/file/services/index";
import { scanSpecs } from "@/server/domain/spec/services/scanSpecs";
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

export async function projectRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/projects
   * Get all projects
   */
  fastify.get(
    "/api/projects",
    {
      preHandler: fastify.authenticate,
    },
    async (_request, reply) => {
      const projects = await getAllProjects();

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

        // Trigger workflow rescan to detect workflows in newly synced projects
        if (fastify.reloadWorkflowEngine) {
          await fastify.reloadWorkflowEngine().catch(() => {
            // Error already logged by decorator, don't break sync flow
          });
        }

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
   * List all spec tasks from .agent/specs/todo/
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
            data: z.array(z.object({
              id: z.string(),
              name: z.string(),
              specPath: z.string(),
              projectId: z.string(),
              status: z.string(),
              spec_type: z.string(),
              created_at: z.string(),
            })),
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

      const specTasks = await scanSpecs(project.path, project.id);

      return reply.send({ data: specTasks });
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
   * POST /api/projects/:id/workflow-package/install
   * Install agentcmd-workflows package in project
   */
  fastify.post<{
    Params: { id: string };
  }>(
    "/api/projects/:id/workflow-package/install",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
      },
    },
    async (request, reply) => {
      try {
        const project = await getProjectById({ id: request.params.id });

        if (!project) {
          return reply
            .code(404)
            .send(buildErrorResponse(404, "Project not found"));
        }

        fastify.log.info(
          { projectId: project.id, projectPath: project.path },
          "Installing agentcmd-workflows package"
        );

        const installResult = await installWorkflowPackage({ projectPath: project.path });

        fastify.log.info(
          { projectId: project.id, success: installResult.success },
          "Install workflow package result"
        );

        // Trigger workflow rescan to detect newly installed workflows
        if (installResult.success && fastify.reloadWorkflowEngine) {
          await fastify.reloadWorkflowEngine().catch(() => {
            // Error already logged by decorator, don't break installation flow
          });
        }

        if (!installResult.success) {
          fastify.log.error(
            { projectId: project.id, error: installResult.message },
            "Workflow SDK installation failed"
          );
        }

        return reply.send({ data: installResult });
      } catch (error) {
        fastify.log.error(
          { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
          "Unexpected error in workflow package install route"
        );
        throw error;
      }
    }
  );

  /**
   * GET /api/projects/:id/spec-types
   * Get available spec types for a project
   */
  fastify.get<{
    Params: { id: string };
  }>(
    "/api/projects/:id/spec-types",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: projectIdSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      fastify.log.info({ projectId: id }, "Fetching available spec types");

      const project = await getProjectById({ id });

      if (!project) {
        return reply
          .code(404)
          .send(buildErrorResponse(404, "Project not found"));
      }

      const specTypes = await getAvailableSpecTypes(project.path);

      return reply.send({ data: specTypes });
    }
  );
}
