// Project domain types
// Re-export shared types for convenience
export type {
  Project,
  ProjectWithSessions,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@/shared/types/project.types";

// Internal service types (input types for service functions)
// DEPRECATED: Use CreateProjectOptions instead
export interface CreateProjectInput {
  name: string;
  path: string;
}

// DEPRECATED: Use UpdateProjectOptions instead
export interface UpdateProjectInput {
  name?: string;
  path?: string;
  is_hidden?: boolean;
  is_starred?: boolean;
}

// Export new options types with Zod schemas
export * from './GetProjectByIdOptions'
export * from './GetProjectByPathOptions'
export * from './GetAllProjectsOptions'
export * from './CreateProjectOptions'
export * from './UpdateProjectOptions'
export * from './DeleteProjectOptions'
export * from './CreateOrUpdateProjectOptions'
export * from './ProjectExistsByPathOptions'
export * from './HasEnoughSessionsOptions'
export * from './SyncProjectFromClaudeOptions'
export * from './GetProjectSlashCommandsOptions'
export * from './CheckWorkflowPackageOptions'
export * from './InstallWorkflowPackageOptions'
export * from './ListSpecFilesOptions'
export * from './SyncFromClaudeProjectsOptions'
