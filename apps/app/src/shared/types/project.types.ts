// Shared types between frontend and backend for type safety across the stack

import type { SessionResponse } from './agent-session.types';

export interface ProjectPreviewConfig {
  dockerFilePath?: string;
  ports?: string[];
  env?: Record<string, string>;
  maxMemory?: string;
  maxCpus?: string;
}

export interface GitCapabilities {
  initialized: boolean;
  error: string | null;
  branch: string | null;
}

export interface WorkflowPackageCapabilities {
  has_package_json: boolean;
  installed: boolean;
  version: string | null;
}

export interface ProjectCapabilities {
  git: GitCapabilities;
  workflow_sdk: WorkflowPackageCapabilities;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  is_hidden: boolean;
  is_starred: boolean;
  created_at: Date;
  updated_at: Date;
  capabilities: ProjectCapabilities;
  preview_config?: ProjectPreviewConfig | null;
}

export interface ProjectWithSessions extends Project {
  sessions: SessionResponse[];
}

// Request/Response types for API endpoints
export interface CreateProjectRequest {
  name: string;
  path: string;
}

export interface UpdateProjectRequest {
  name?: string;
  path?: string;
  is_hidden?: boolean;
  is_starred?: boolean;
  preview_config?: ProjectPreviewConfig | null;
}

export interface ProjectResponse {
  data: Project;
}

export interface ProjectsResponse {
  data: Project[];
}

export interface ProjectsWithSessionsResponse {
  data: ProjectWithSessions[];
}

export interface ErrorResponse {
  error: string;
  message?: string;
}
