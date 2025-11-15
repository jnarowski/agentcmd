import { z } from "zod";
import type { Prisma } from "@prisma/client";

/**
 * Options for getWorkflowDefinitionBy - uses findFirst for flexible non-unique lookups
 * Accepts any filter combination (path, status, type, etc.)
 */

// Zod schema for runtime validation
export const getWorkflowDefinitionByOptionsSchema = z.object({
  where: z.custom<Prisma.WorkflowDefinitionWhereInput>(),
  orderBy: z
    .custom<Prisma.WorkflowDefinitionOrderByWithRelationInput>()
    .optional(),
  include: z.custom<Prisma.WorkflowDefinitionInclude>().optional(),
});

export type GetWorkflowDefinitionByOptions = z.infer<
  typeof getWorkflowDefinitionByOptionsSchema
>;
