import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/shared/prisma';
import { buildSuccessResponse } from '@/server/utils/response';
import { NotFoundError } from '@/server/errors';
import {
  getWorkflowDefinitions,
  archiveWorkflowDefinition,
  unarchiveWorkflowDefinition,
} from '@/server/domain/workflow/services';
import {
  GetWorkflowDefinitionsQuerySchema,
  ArchiveWorkflowDefinitionParamsSchema,
  UnarchiveWorkflowDefinitionParamsSchema,
  WorkflowDefinitionResponseSchema,
} from '@/server/domain/workflow/schemas';
import '@/server/plugins/auth';

/**
 * Zod schemas for workflow definitions
 */
const WorkflowDefinitionIdSchema = z.object({
  id: z.string().cuid(),
});

/**
 * Register workflow definition routes
 */
export async function registerWorkflowDefinitionRoutes(
  fastify: FastifyInstance
): Promise<void> {
  /**
   * GET /api/projects/:projectId/workflow-definitions
   * List workflow templates for a specific project (includes global workflows)
   * Supports optional status filter (active/archived)
   */
  fastify.get<{
    Params: { projectId: string };
    Querystring: z.infer<typeof GetWorkflowDefinitionsQuerySchema>;
    Reply: { data: unknown };
  }>(
    '/api/projects/:projectId/workflow-definitions',
    {
      schema: {
        params: z.object({
          projectId: z.string().cuid(),
        }),
        querystring: GetWorkflowDefinitionsQuerySchema,
        response: {
          200: z.object({
            data: z.array(WorkflowDefinitionResponseSchema),
          }),
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const userId = (request.user! as { id: string }).id;
      const { projectId } = request.params;
      const { status } = request.query;

      fastify.log.info({ userId, projectId, status }, 'Fetching workflow definitions for project');

      // Use service function with status filter
      const definitions = await getWorkflowDefinitions(projectId, status);

      // Parse JSON fields (Prisma stores JSON as strings in SQLite)
      const parsedDefinitions = definitions.map((def) => ({
        ...def,
        phases: typeof def.phases === 'string' ? JSON.parse(def.phases) : def.phases,
        args_schema: def.args_schema && typeof def.args_schema === 'string'
          ? JSON.parse(def.args_schema)
          : def.args_schema,
      }));

      return reply.send(buildSuccessResponse(parsedDefinitions));
    }
  );

  /**
   * GET /api/workflow-definitions
   * List all workflow templates (global - kept for backwards compatibility)
   */
  fastify.get<{
    Reply: { data: unknown };
  }>(
    '/api/workflow-definitions',
    {
      schema: {
        response: {
          200: z.object({
            data: z.array(WorkflowDefinitionResponseSchema),
          }),
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const userId = (request.user! as { id: string }).id;

      fastify.log.info({ userId }, 'Fetching workflow definitions');

      const definitions = await prisma.workflowDefinition.findMany({
        where: {
          is_template: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Parse JSON fields (Prisma stores JSON as strings in SQLite)
      const parsedDefinitions = definitions.map((def) => ({
        ...def,
        phases: typeof def.phases === 'string' ? JSON.parse(def.phases) : def.phases,
        args_schema: def.args_schema && typeof def.args_schema === 'string'
          ? JSON.parse(def.args_schema)
          : def.args_schema,
      }));

      return reply.send(buildSuccessResponse(parsedDefinitions));
    }
  );

  /**
   * GET /api/workflow-definitions/:id
   * Get single workflow template by ID
   */
  fastify.get<{
    Params: z.infer<typeof WorkflowDefinitionIdSchema>;
  }>(
    '/api/workflow-definitions/:id',
    {
      schema: {
        params: WorkflowDefinitionIdSchema,
        response: {
          200: z.object({
            data: WorkflowDefinitionResponseSchema,
          }),
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = ((request.user! as { id: string }).id);

      fastify.log.info({ userId, definitionId: id }, 'Fetching workflow definition');

      const definition = await prisma.workflowDefinition.findUnique({
        where: { id },
      });

      if (!definition) {
        throw new NotFoundError('Workflow definition not found');
      }

      // Parse JSON fields (Prisma stores JSON as strings in SQLite)
      const parsedDefinition = {
        ...definition,
        phases: typeof definition.phases === 'string' ? JSON.parse(definition.phases) : definition.phases,
        args_schema: definition.args_schema && typeof definition.args_schema === 'string'
          ? JSON.parse(definition.args_schema)
          : definition.args_schema,
      };

      return reply.send(buildSuccessResponse(parsedDefinition));
    }
  );

  /**
   * PATCH /api/workflow-definitions/:id/archive
   * Archive a workflow definition
   */
  fastify.patch<{
    Params: z.infer<typeof ArchiveWorkflowDefinitionParamsSchema>;
  }>(
    '/api/workflow-definitions/:id/archive',
    {
      schema: {
        params: ArchiveWorkflowDefinitionParamsSchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user! as { id: string }).id;

      fastify.log.info({ userId, definitionId: id }, 'Archiving workflow definition');

      const definition = await archiveWorkflowDefinition(id);

      if (!definition) {
        throw new NotFoundError('Workflow definition not found');
      }

      // Parse JSON fields
      const parsedDefinition = {
        ...definition,
        phases: typeof definition.phases === 'string' ? JSON.parse(definition.phases) : definition.phases,
        args_schema: definition.args_schema && typeof definition.args_schema === 'string'
          ? JSON.parse(definition.args_schema)
          : definition.args_schema,
      };

      return reply.send(buildSuccessResponse(parsedDefinition));
    }
  );

  /**
   * PATCH /api/workflow-definitions/:id/unarchive
   * Unarchive a workflow definition
   */
  fastify.patch<{
    Params: z.infer<typeof UnarchiveWorkflowDefinitionParamsSchema>;
  }>(
    '/api/workflow-definitions/:id/unarchive',
    {
      schema: {
        params: UnarchiveWorkflowDefinitionParamsSchema,
      },
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user! as { id: string }).id;

      fastify.log.info({ userId, definitionId: id }, 'Unarchiving workflow definition');

      const definition = await unarchiveWorkflowDefinition(id);

      if (!definition) {
        throw new NotFoundError('Workflow definition not found');
      }

      // Parse JSON fields
      const parsedDefinition = {
        ...definition,
        phases: typeof definition.phases === 'string' ? JSON.parse(definition.phases) : definition.phases,
        args_schema: definition.args_schema && typeof definition.args_schema === 'string'
          ? JSON.parse(definition.args_schema)
          : definition.args_schema,
      };

      return reply.send(buildSuccessResponse(parsedDefinition));
    }
  );
}
