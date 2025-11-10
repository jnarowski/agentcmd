import { z } from "zod";

/**
 * Archive workflow definition request schema
 */
export const ArchiveWorkflowDefinitionParamsSchema = z.object({
  id: z.string().cuid(),
});

/**
 * Unarchive workflow definition request schema
 */
export const UnarchiveWorkflowDefinitionParamsSchema = z.object({
  id: z.string().cuid(),
});

/**
 * Get workflow definitions query schema
 */
export const GetWorkflowDefinitionsQuerySchema = z.object({
  status: z.enum(["active", "archived"]).optional(),
});

/**
 * Single workflow definition response schema
 */
export const WorkflowDefinitionResponseSchema = z.object({
  id: z.string(),
  scope: z.enum(['project', 'global']),
  name: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  path: z.string(),
  phases: z.any(), // JSON
  args_schema: z.any().nullable(), // JSON
  is_template: z.boolean(),
  status: z.string(),
  load_error: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

/**
 * Workflow definitions list response schema (for tests)
 */
export const WorkflowDefinitionsResponseSchema = z.object({
  data: z.array(WorkflowDefinitionResponseSchema),
});
