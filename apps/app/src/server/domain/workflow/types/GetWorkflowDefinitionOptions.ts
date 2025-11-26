import { z } from "zod";
import type { Prisma } from "@prisma/client";

/**
 * Options for getWorkflowDefinition - uses findUnique for O(1) indexed lookup
 * Supports two unique constraints: id OR project_id_identifier compound key
 */

// Zod schema for runtime validation
export const getWorkflowDefinitionOptionsSchema = z.object({
  where: z.union([
    z.object({ id: z.string().min(1, "ID required") }),
    z.object({
      project_id_identifier: z.object({
        project_id: z.string().min(1, "Project ID required"),
        identifier: z.string().min(1, "Identifier required"),
      }),
    }),
  ]),
  include: z.custom<Prisma.WorkflowDefinitionInclude>().optional(),
});

export type GetWorkflowDefinitionOptions = z.infer<
  typeof getWorkflowDefinitionOptionsSchema
>;
