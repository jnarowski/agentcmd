import { z } from "zod";
import type { Prisma } from "@prisma/client";

/**
 * Options for deleteWorkflowDefinition
 * Hard delete by id (prefer soft delete via updateWorkflowDefinition)
 */

// Zod schema for runtime validation
export const deleteWorkflowDefinitionOptionsSchema = z.object({
  id: z.string().min(1, "ID required"),
  include: z.custom<Prisma.WorkflowDefinitionInclude>().optional(),
});

export type DeleteWorkflowDefinitionOptions = z.infer<
  typeof deleteWorkflowDefinitionOptionsSchema
>;
