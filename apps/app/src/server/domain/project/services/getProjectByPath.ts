/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/shared/prisma";
import type { Project, ProjectCapabilities, ProjectPreviewConfig } from "@/shared/types/project.types";
import { isGitRepository } from "@/server/domain/git/services/isGitRepository";
import { checkWorkflowPackage } from "@/server/domain/project/services/checkWorkflowPackage";
import type { GetProjectByPathOptions } from "@/server/domain/project/types/GetProjectByPathOptions";

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
    preview_config: prismaProject.preview_config as ProjectPreviewConfig | null,
  };
}

/**
 * Get a project by its path
 * @param options - Options object with path
 * @returns Project or null if not found
 */
export async function getProjectByPath({ path }: GetProjectByPathOptions): Promise<Project | null> {
  const project = await prisma.project.findFirst({
    where: { path },
  });
  if (!project) {
    return null;
  }
  const capabilities = await buildCapabilities(project.path);
  return transformProject(project, capabilities);
}
