import { z } from "zod";
import type { Prisma } from "@prisma/client";

/**
 * Options for upsertWorkflowDefinition
 * Uses Prisma upsert pattern with compound unique key
 */

// Zod schema for runtime validation
export const upsertWorkflowDefinitionOptionsSchema = z.object({
  where: z.object({
    project_id_identifier: z.object({
      project_id: z.string().min(1, "Project ID required"),
      identifier: z.string().min(1, "Identifier required"),
    }),
  }),
  create: z.custom<Prisma.WorkflowDefinitionCreateInput>(),
  update: z.custom<Prisma.WorkflowDefinitionUpdateInput>(),
  include: z.custom<Prisma.WorkflowDefinitionInclude>().optional(),
});

export type UpsertWorkflowDefinitionOptions = z.infer<
  typeof upsertWorkflowDefinitionOptionsSchema
>;
