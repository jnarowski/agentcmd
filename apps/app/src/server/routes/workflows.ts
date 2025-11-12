import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createWorkflowRun,
  getWorkflowRunById,
  getAllWorkflowRuns,
  executeWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
  generateRunNames,
  getStepLogs,
  getInngestRunStatus,
} from "@/server/domain/workflow/services";
import type { WorkflowStatus } from "@/server/domain/workflow/types/workflow.types";
import { readFile } from "@/server/domain/file/services/readFile";
import {
  createWorkflowRunSchema,
  workflowRunFiltersSchema,
} from "@/shared/schemas/workflow.schemas";
import { NotFoundError } from "@/server/errors";
import { scanProjectWorkflows } from "@/server/domain/workflow/services/engine";
import { prisma } from "@/shared/prisma";
import "@/server/plugins/auth";

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
        mode: body.mode,
        base_branch: body.base_branch,
        branch_name: body.branch_name,
      });

      if (!run) {
        throw new NotFoundError("Workflow definition not found");
      }

      // Start run via Inngest
      try {
        const { workflowClient } = fastify;

        if (!workflowClient) {
          throw new Error(
            "Workflow engine not initialized. Please enable workflow engine in configuration."
          );
        }

        await executeWorkflow({
          runId: run.id,
          workflowClient,
          logger: fastify.log,
        });

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
   * List workflow runs (project-specific or user-wide)
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

      // Parse status - can be single value or comma-separated array
      const parsedStatus = Array.isArray(status)
        ? (status as unknown as WorkflowStatus[])
        : status;

      fastify.log.info(
        { userId, projectId: project_id, status: parsedStatus },
        "Fetching workflow runs"
      );

      const runs = await getAllWorkflowRuns({
        userId,
        projectId: project_id,
        status: parsedStatus,
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

      fastify.log.info({ userId, runId: id }, "Fetching workflow run");

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

      fastify.log.info({ userId, runId: id }, "Pausing workflow run");

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

      const updated = await pauseWorkflow({
        runId: id,
        userId,
        logger: fastify.log,
      });

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

      fastify.log.info({ userId, runId: id }, "Resuming workflow run");

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

      const updated = await resumeWorkflow({
        runId: id,
        userId,
        logger: fastify.log,
      });

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

      fastify.log.info({ userId, runId: id }, "Cancelling workflow run");

      const run = await getWorkflowRunById({ id });

      if (!run) {
        throw new NotFoundError("Workflow run not found");
      }

      if (run.user_id !== userId) {
        return reply
          .code(403)
          .send({ error: { message: "Access denied", statusCode: 403 } });
      }

      const updated = await cancelWorkflow({
        runId: id,
        userId,
        reason: undefined,
        logger: fastify.log,
      });

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

  /**
   * GET /api/workflow-runs/:runId/steps/:stepId/logs
   * Get step execution logs from filesystem
   */
  fastify.get<{
    Params: { runId: string; stepId: string };
  }>(
    "/api/workflow-runs/:runId/steps/:stepId/logs",
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { runId, stepId } = request.params;

      fastify.log.info({ runId, stepId }, "Fetching step logs");

      const result = await getStepLogs(runId, stepId);

      if (!result) {
        throw new NotFoundError("Step logs not found");
      }

      return reply.send({ data: result });
    }
  );

  /**
   * GET /api/workflow-runs/:runId/inngest-status
   * Get Inngest run status from Inngest dev server
   */
  fastify.get<{
    Params: { runId: string };
  }>(
    "/api/workflow-runs/:runId/inngest-status",
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { runId } = request.params;

      fastify.log.info({ runId }, "Fetching Inngest run status");

      // Get workflow run to fetch inngest_run_id
      const run = await getWorkflowRunById({ id: runId });

      if (!run) {
        throw new NotFoundError("Workflow run not found");
      }

      if (!run.inngest_run_id) {
        return reply.send({
          success: false,
          error: "No Inngest run ID associated with this workflow run",
        });
      }

      const result = await getInngestRunStatus(run.inngest_run_id);

      return reply.send(result);
    }
  );
}
