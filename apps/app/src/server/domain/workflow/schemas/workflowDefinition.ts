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
