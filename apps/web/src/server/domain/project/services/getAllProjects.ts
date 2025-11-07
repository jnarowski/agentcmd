/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/shared/prisma";
import type {
  Project,
  ProjectWithSessions,
  ProjectCapabilities,
} from "@/shared/types/project.types";
import type { SessionResponse } from "@/shared/types/agent-session.types";
import { isGitRepository } from "@/server/domain/git/services/isGitRepository";
import { checkWorkflowPackage } from "@/server/domain/project/services/checkWorkflowPackage";
import type { GetAllProjectsOptions } from "../types/GetAllProjectsOptions";

/**
 * Transform Prisma session to API session format
 * @param prismaSession - Raw session from Prisma
 */
function transformSession(prismaSession: any): SessionResponse {
  return {
    id: prismaSession.id,
    projectId: prismaSession.projectId,
    userId: prismaSession.userId,
    name: prismaSession.name,
    agent: prismaSession.agent,
    cli_session_id: prismaSession.cli_session_id,
    session_path: prismaSession.session_path,
    metadata: prismaSession.metadata,
    state: prismaSession.state as 'idle' | 'working' | 'error',
    error_message: prismaSession.error_message ?? undefined,
    is_archived: prismaSession.is_archived,
    archived_at: prismaSession.archived_at,
    created_at: prismaSession.created_at,
    updated_at: prismaSession.updated_at,
  };
}

/**
 * Build capabilities object for a project
 * @param projectPath - Path to the project
 * @returns Capabilities object with git and workflow SDK status
 */
async function buildCapabilities(projectPath: string): Promise<ProjectCapabilities> {
  // Run both checks in parallel
  const [gitStatus, sdkStatus] = await Promise.all([
    (async () => {
      try {
        return await isGitRepository(projectPath);
      } catch (error) {
        return { initialized: false, error: error instanceof Error ? error.message : "Unknown error", branch: null };
      }
    })(),
    (async () => {
      try {
        const result = await checkWorkflowPackage({ projectPath });
        return {
          has_package_json: result.hasPackageJson,
          installed: result.installed,
          version: result.version ?? null,
        };
      } catch  {
        return { has_package_json: false, installed: false, version: null };
      }
    })(),
  ]);

  return {
    git: gitStatus,
    workflow_sdk: sdkStatus,
  };
}

/**
 * Transform Prisma project to API project format
 * @param prismaProject - Raw project from Prisma
 * @param capabilities - Project capabilities (git, workflow SDK)
 */
function transformProject(
  prismaProject: any,
  capabilities: ProjectCapabilities
): Project {
  return {
    id: prismaProject.id,
    name: prismaProject.name,
    path: prismaProject.path,
    is_hidden: prismaProject.is_hidden,
    is_starred: prismaProject.is_starred,
    created_at: prismaProject.created_at,
    updated_at: prismaProject.updated_at,
    capabilities,
  };
}

/**
 * Transform Prisma project with sessions to API format
 * @param prismaProject - Raw project from Prisma with sessions
 * @param capabilities - Project capabilities (git, workflow SDK)
 */
function transformProjectWithSessions(
  prismaProject: any,
  capabilities: ProjectCapabilities
): ProjectWithSessions {
  return {
    ...transformProject(prismaProject, capabilities),
    sessions: prismaProject.sessions
      ? prismaProject.sessions.map(transformSession)
      : [],
  };
}

/**
 * Get all projects (with optional sessions)
 * @param options - Options for fetching projects
 * @param options.includeSessions - Whether to include sessions
 * @param options.sessionLimit - Maximum number of sessions per project (default: 20)
 * @returns Array of all projects ordered by creation date (newest first)
 */
export async function getAllProjects(
  { includeSessions = false, sessionLimit = 20 }: GetAllProjectsOptions = {}
): Promise<Project[] | ProjectWithSessions[]> {

  const projects = await prisma.project.findMany({
    orderBy: {
      created_at: "desc",
    },
    take: 500,
    ...(includeSessions && {
      include: {
        sessions: {
          orderBy: {
            created_at: "desc",
          },
          take: sessionLimit,
          select: {
            id: true,
            projectId: true,
            userId: true,
            name: true,
            agent: true,
            cli_session_id: true,
            session_path: true,
            metadata: true,
            state: true,
            error_message: true,
            is_archived: true,
            archived_at: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    }),
  });

  // Fetch capabilities for each project
  const projectsWithCapabilities = await Promise.all(
    projects.map(async (project) => {
      const capabilities = await buildCapabilities(project.path);
      return { project, capabilities };
    })
  );

  if (includeSessions) {
    return projectsWithCapabilities.map(({ project, capabilities }) =>
      transformProjectWithSessions(project, capabilities)
    );
  }

  return projectsWithCapabilities.map(({ project, capabilities }) =>
    transformProject(project, capabilities)
  );
}
