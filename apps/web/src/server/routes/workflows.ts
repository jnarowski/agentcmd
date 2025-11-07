import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createWorkflowRun,
  getWorkflowRunById,
  getWorkflowRuns,
  executeWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
  generateRunNames,
} from "@/server/domain/workflow/services";
import { readFile } from "@/server/domain/file/services/readFile";
import {
  createWorkflowRunSchema,
  workflowRunFiltersSchema,
} from "@/shared/schemas/workflow.schemas";
import { NotFoundError } from "@/server/errors";
import { scanProjectWorkflows } from "@/server/domain/workflow/services/engine";
import { prisma } from "@/shared/prisma";
import '@/server/plugins/auth';

// Params schema
const runIdSchema = z.object({
  id: z.cuid(),
});

export async function workflowRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/workflow-runs
   * Create and start a workflow run
   */
  fastify.post<{
    Body: z.infer<typeof createWorkflowRunSchema>;
  }>(
    "/api/workflow-runs",
    {
      preHandler: fastify.authenticate,
      schema: {
        body: createWorkflowRunSchema,
      },
    },
    async (request, reply) => {
      const userId = (request.user! as { id: string }).id;
      const body = request.body;

      fastify.log.info(
        { userId, workflowDefinitionId: body.workflow_definition_id },
        "Creating workflow run"
      );

      const run = await createWorkflowRun({
        project_id: body.project_id,
        user_id: userId,
        workflow_definition_id: body.workflow_definition_id,
        name: body.name,
        args: body.args,
        spec_file: body.spec_file,
        spec_content: body.spec_content,
        branch_from: body.branch_from,
        branch_name: body.branch_name,
        worktree_name: body.worktree_name,
      });

      if (!run) {
        throw new NotFoundError("Workflow definition not found");
      }

      // Start run via Inngest
      try {
        await executeWorkflow({ runId: run.id, fastify, logger: fastify.log });

        fastify.log.info(
          { runId: run.id, userId },
          "Workflow run triggered successfully"
        );
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        fastify.log.error(
          { err, runId: run.id, userId },
          "Failed to trigger workflow run"
        );

        // Re-throw to let global error handler return 500
        throw err;
      }

      return reply.code(201).send({ data: run });
    }
  );

  /**
   * GET /api/workflow-runs
   * List workflow runs for a project
   */
  fastify.get<{
    Querystring: z.infer<typeof workflowRunFiltersSchema>;
  }>(
    "/api/workflow-runs",
    {
      preHandler: fastify.authenticate,
      schema: {
        querystring: workflowRunFiltersSchema,
      },
    },
    async (request, reply) => {
      const userId = (request.user! as { id: string }).id;
      const { project_id, status } = request.query;

      if (!project_id) {
        return reply.code(400).send({
          error: { message: "project_id is required", statusCode: 400 },
        });
      }

      fastify.log.info(
        { userId, projectId: project_id, status },
        "Fetching workflow runs"
      );

      const runs = await getWorkflowRuns({
        project_id,
        user_id: userId,
        status,
      });

      return reply.send({ data: runs });
    }
  );

  /**
   * GET /api/workflow-runs/:id
   * Get detailed run information
   */
  fastify.get<{
    Params: z.infer<typeof runIdSchema>;
  }>(
    "/api/workflow-runs/:id",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: runIdSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user! as { id: string }).id;

      fastify.log.info(
        { userId, runId: id },
        "Fetching workflow run"
      );

      const run = await getWorkflowRunById({ id });

      if (!run) {
        throw new NotFoundError("Workflow run not found");
      }

      // Verify user owns this run
      if (run.user_id !== userId) {
        return reply
          .code(403)
          .send({ error: { message: "Access denied", statusCode: 403 } });
      }

      return reply.send({ data: run });
    }
  );

  /**
   * POST /api/workflow-runs/:id/pause
   * Pause a running workflow run
   */
  fastify.post<{
    Params: z.infer<typeof runIdSchema>;
  }>(
    "/api/workflow-runs/:id/pause",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: runIdSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user! as { id: string }).id;

      fastify.log.info(
        { userId, runId: id },
        "Pausing workflow run"
      );

      const run = await getWorkflowRunById({ id });

      if (!run) {
        throw new NotFoundError("Workflow run not found");
      }

      if (run.user_id !== userId) {
        return reply
          .code(403)
          .send({ error: { message: "Access denied", statusCode: 403 } });
      }

      if (run.status !== "running") {
        return reply.code(400).send({
          error: { message: "Run is not running", statusCode: 400 },
        });
      }

      const updated = await pauseWorkflow({ runId: id, userId, logger: fastify.log });

      return reply.send({ data: updated });
    }
  );

  /**
   * POST /api/workflow-runs/:id/resume
   * Resume a paused workflow run
   */
  fastify.post<{
    Params: z.infer<typeof runIdSchema>;
  }>(
    "/api/workflow-runs/:id/resume",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: runIdSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user! as { id: string }).id;

      fastify.log.info(
        { userId, runId: id },
        "Resuming workflow run"
      );

      const run = await getWorkflowRunById({ id });

      if (!run) {
        throw new NotFoundError("Workflow run not found");
      }

      if (run.user_id !== userId) {
        return reply
          .code(403)
          .send({ error: { message: "Access denied", statusCode: 403 } });
      }

      if (run.status !== "paused") {
        return reply.code(400).send({
          error: { message: "Run is not paused", statusCode: 400 },
        });
      }

      const updated = await resumeWorkflow({ runId: id, userId, logger: fastify.log });

      return reply.send({ data: updated });
    }
  );

  /**
   * POST /api/workflow-runs/:id/cancel
   * Cancel a workflow run
   */
  fastify.post<{
    Params: z.infer<typeof runIdSchema>;
  }>(
    "/api/workflow-runs/:id/cancel",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: runIdSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user! as { id: string }).id;

      fastify.log.info(
        { userId, runId: id },
        "Cancelling workflow run"
      );

      const run = await getWorkflowRunById({ id });

      if (!run) {
        throw new NotFoundError("Workflow run not found");
      }

      if (run.user_id !== userId) {
        return reply
          .code(403)
          .send({ error: { message: "Access denied", statusCode: 403 } });
      }

      const updated = await cancelWorkflow({ runId: id, userId, reason: undefined, logger: fastify.log });

      return reply.send({ data: updated });
    }
  );

  /**
   * POST /api/projects/:projectId/workflows/refresh
   * Re-scan project for workflows
   */
  fastify.post<{
    Params: { projectId: string };
  }>(
    "/api/projects/:projectId/workflows/refresh",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: z.object({
          projectId: z.string().cuid(),
        }),
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const userId = (request.user! as { id: string }).id;

      fastify.log.info({ userId, projectId }, "Refreshing project workflows");

      // Get project
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundError("Project not found");
      }

      // Scan project for workflows
      const discovered = await scanProjectWorkflows(
        projectId,
        project.path,
        // @ts-ignore - workflowOrchestrator added by plugin
        fastify.workflowOrchestrator,
        fastify.log
      );

      return reply.send({
        data: {
          projectId,
          discovered,
        },
      });
    }
  );

  /**
   * GET /api/projects/:projectId/workflows
   * List workflows for a project
   */
  fastify.get<{
    Params: { projectId: string };
  }>(
    "/api/projects/:projectId/workflows",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: z.object({
          projectId: z.string().cuid(),
        }),
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const userId = (request.user! as { id: string }).id;

      fastify.log.info({ userId, projectId }, "Fetching project workflows");

      // Get project to verify ownership
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundError("Project not found");
      }

      // Get workflow definitions for project
      const workflows = await prisma.workflowDefinition.findMany({
        where: { project_id: projectId },
        orderBy: { name: "asc" },
      });

      return reply.send({ data: workflows });
    }
  );

  /**
   * POST /api/workflows/generate-names-from-spec
   * Generate run and branch names from spec file using AI
   */
  fastify.post<{
    Body: {
      projectId: string;
      specFile: string;
    };
  }>(
    "/api/workflows/generate-names-from-spec",
    {
      preHandler: fastify.authenticate,
      schema: {
        body: z.object({
          projectId: z.string().cuid(),
          specFile: z.string().min(1),
        }),
      },
    },
    async (request, reply) => {
      const userId = (request.user! as { id: string }).id;
      const { projectId, specFile } = request.body;

      fastify.log.info(
        { userId, projectId, specFile },
        "Generating run names from spec"
      );

      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundError("Project not found");
      }

      // Read spec file from .agent/specs/todo/{specFile}
      const specPath = `.agent/specs/todo/${specFile}`;

      let specContent: string;
      try {
        specContent = await readFile({ projectId, filePath: specPath });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        fastify.log.error(
          { err, projectId, specPath },
          "Failed to read spec file"
        );
        throw new NotFoundError("Spec file not found");
      }

      // Generate names using AI
      const names = await generateRunNames({ specContent });

      return reply.send({ data: names });
    }
  );
}
