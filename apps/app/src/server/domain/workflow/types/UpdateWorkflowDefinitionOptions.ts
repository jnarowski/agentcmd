import { z } from "zod";
import type { Prisma } from "@prisma/client";

/**
 * Options for updateWorkflowDefinition
 * Uses Prisma update pattern with id and partial data
 */

// Zod schema for runtime validation
export const updateWorkflowDefinitionOptionsSchema = z.object({
  id: z.string().min(1, "ID required"),
  data: z.custom<Prisma.WorkflowDefinitionUpdateInput>(),
  include: z.custom<Prisma.WorkflowDefinitionInclude>().optional(),
});

export type UpdateWorkflowDefinitionOptions = z.infer<
  typeof updateWorkflowDefinitionOptionsSchema
>;
