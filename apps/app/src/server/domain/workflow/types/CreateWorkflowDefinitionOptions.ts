import { z } from "zod";
import type { Prisma } from "@prisma/client";

/**
 * Options for createWorkflowDefinition
 * Uses Prisma create pattern with data object
 */

// Zod schema for runtime validation
export const createWorkflowDefinitionOptionsSchema = z.object({
  data: z.custom<Prisma.WorkflowDefinitionCreateInput>(),
  include: z.custom<Prisma.WorkflowDefinitionInclude>().optional(),
});

export type CreateWorkflowDefinitionOptions = z.infer<
  typeof createWorkflowDefinitionOptionsSchema
>;
