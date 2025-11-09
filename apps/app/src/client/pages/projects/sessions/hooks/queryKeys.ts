import type { GetSessionsFilters } from "./useAgentSessions";

/**
 * Query key factory for agent sessions
 */
export const sessionKeys = {
  all: ["agentSessions"] as const,

  // List queries - generic and project-scoped
  lists: () => [...sessionKeys.all, "list"] as const,
  list: (filters?: GetSessionsFilters) =>
    [...sessionKeys.lists(), filters] as const,

  // Project-scoped (backward compatible)
  byProject: (projectId: string) =>
    [...sessionKeys.all, "byProject", projectId] as const,

  // Detail queries - single session
  details: () => [...sessionKeys.all, "detail"] as const,
  detail: (sessionId: string, projectId: string) =>
    [...sessionKeys.details(), sessionId, projectId] as const,

  // Message queries - session messages
  messages: (sessionId: string, projectId: string) =>
    [...sessionKeys.all, "messages", sessionId, projectId] as const,

  // File queries - session file viewer
  file: (sessionId: string) =>
    [...sessionKeys.all, "file", sessionId] as const,
};

/**
 * Query key factory for slash commands
 */
export const slashCommandKeys = {
  all: ["slash-commands"] as const,
  projects: () => [...slashCommandKeys.all, "project"] as const,
  project: (projectId: string) =>
    [...slashCommandKeys.projects(), projectId] as const,
};
