export const containerQueryKeys = {
  all: ["containers"] as const,
  list: (projectId: string, status?: string) =>
    [...containerQueryKeys.all, "list", projectId, status] as const,
  detail: (containerId: string) =>
    [...containerQueryKeys.all, "detail", containerId] as const,
  logs: (containerId: string) =>
    [...containerQueryKeys.all, "logs", containerId] as const,
};
