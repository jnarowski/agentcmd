import { z } from "zod";
import type { Prisma } from "@prisma/client";

/**
 * Options for getWorkflowDefinitions - uses findMany for bulk queries
 * Supports full Prisma API: where, select, orderBy, skip, take
 */

// Zod schema for runtime validation
export const getWorkflowDefinitionsOptionsSchema = z.object({
  where: z.custom<Prisma.WorkflowDefinitionWhereInput>().optional(),
  select: z.custom<Prisma.WorkflowDefinitionSelect>().optional(),
  include: z.custom<Prisma.WorkflowDefinitionInclude>().optional(),
  orderBy: z
    .custom<Prisma.WorkflowDefinitionOrderByWithRelationInput>()
    .optional(),
  skip: z.number().int().nonnegative().optional(),
  take: z.number().int().positive().optional(),
});

export type GetWorkflowDefinitionsOptions = z.infer<
  typeof getWorkflowDefinitionsOptionsSchema
>;
