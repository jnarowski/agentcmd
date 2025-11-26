/**
 * Query key factory for projects
 */
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: () => [...projectKeys.lists()] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  readme: (id: string) => [...projectKeys.detail(id), "readme"] as const,
  sync: () => [...projectKeys.all, "sync"] as const,
  specs: (id: string, status?: string | string[]) =>
    status
      ? [...projectKeys.detail(id), "specs", status] as const
      : [...projectKeys.detail(id), "specs"] as const,
  branches: (id: string) => [...projectKeys.detail(id), "branches"] as const,
};
