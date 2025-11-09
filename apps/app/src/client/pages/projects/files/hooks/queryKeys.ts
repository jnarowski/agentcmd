/**
 * Query key factory for files
 */
export const fileKeys = {
  all: ["files"] as const,
  projects: () => [...fileKeys.all, "project"] as const,
  project: (projectId: string) => [...fileKeys.projects(), projectId] as const,
};
