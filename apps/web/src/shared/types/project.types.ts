// Shared types between frontend and backend for type safety across the stack

import type { SessionResponse } from './agent-session.types';

export interface Project {
  id: string;
  name: string;
  path: string;
  is_hidden: boolean;
  is_starred: boolean;
  created_at: Date;
  updated_at: Date;
  current_branch?: string;
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
