import { prisma } from "@/shared/prisma";
import type { GetWorkflowDefinitionsOptions } from "../../types/GetWorkflowDefinitionsOptions";

/**
 * Get multiple workflow definitions with full Prisma API support
 * Supports filtering, selection, sorting, and pagination
 * Replaces both getWorkflowDefinitions and getAllWorkflowDefinitions
 */
export async function getWorkflowDefinitions(
  options: GetWorkflowDefinitionsOptions = {}
) {
  const { where, select, include, orderBy, skip, take } = options;

  // Prisma doesn't allow both select and include
  // If select is provided, use it and ignore include
  // If neither provided, use default include with _count.runs
  if (select) {
    return await prisma.workflowDefinition.findMany({
      where,
      select,
      orderBy,
      skip,
      take,
    });
  }

  const includeConfig = include ?? {
    _count: {
      select: {
        runs: true,
      },
    },
  };

  return await prisma.workflowDefinition.findMany({
    where,
    include: includeConfig,
    orderBy,
    skip,
    take,
  });
}
