/**
 * Query key factory for slash commands
 */
export const slashCommandKeys = {
  all: ["slash-commands"] as const,
  projects: () => [...slashCommandKeys.all, "project"] as const,
  project: (projectId: string) =>
    [...slashCommandKeys.projects(), projectId] as const,
};
