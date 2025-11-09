/**
 * Query key factory for workflows
 * Hierarchical structure for CRUD resources
 */
export const workflowKeys = {
  all: ["workflows"] as const,

  // Workflow Definitions
  definitions: () => [...workflowKeys.all, "definitions"] as const,
  definitionsList: (projectId: string, status?: string) =>
    [...workflowKeys.definitions(), projectId, status] as const,
  definition: (id: string) => [...workflowKeys.definitions(), id] as const,

  // Workflow Runs
  runs: () => [...workflowKeys.all, "runs"] as const,
  allRuns: () => [...workflowKeys.runs(), "all"] as const,
  runsList: (
    projectId: string,
    status?: string,
    search?: string,
    definitionId?: string
  ) => [...workflowKeys.runs(), projectId, status, search, definitionId] as const,
  run: (id: string) => [...workflowKeys.runs(), id] as const,
  inngestStatus: (runId: string) =>
    [...workflowKeys.runs(), "inngest-status", runId] as const,

  // Workflow Definitions - user-wide
  allDefinitions: (status?: string) =>
    [...workflowKeys.definitions(), "all", status] as const,
};
