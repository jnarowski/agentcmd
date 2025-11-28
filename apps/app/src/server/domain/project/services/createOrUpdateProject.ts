/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/shared/prisma";
import type { Project, ProjectCapabilities, ProjectPreviewConfig } from "@/shared/types/project.types";
import { isGitRepository } from "@/server/domain/git/services/isGitRepository";
import { checkWorkflowPackage } from "@/server/domain/project/services/checkWorkflowPackage";
import type { CreateOrUpdateProjectOptions } from "@/server/domain/project/types/CreateOrUpdateProjectOptions";

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
 * Migrate old ports format (string[]) to new format (Record<string, number>)
 */
function migratePreviewConfig(config: any): ProjectPreviewConfig | null {
  if (!config) return null;
  const migrated: ProjectPreviewConfig = { ...config };
  if (Array.isArray(config.ports)) {
    const newPorts: Record<string, number> = {};
    let defaultPort = 3000;
    for (const portName of config.ports) {
      const envVar = `PREVIEW_PORT_${String(portName).toUpperCase().replace(/-/g, "_")}`;
      newPorts[envVar] = defaultPort++;
    }
    migrated.ports = Object.keys(newPorts).length > 0 ? newPorts : undefined;
  }
  return migrated;
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
    preview_config: migratePreviewConfig(prismaProject.preview_config),
  };
}

/**
 * Create a new project or update an existing one by path
 * Uses upsert to ensure atomic operation and prevent race conditions
 * @param options - Options object with name and path
 * @returns Created or updated project
 */
export async function createOrUpdateProject({ name, path }: CreateOrUpdateProjectOptions): Promise<Project> {
  const project = await prisma.project.upsert({
    where: { path },
    update: {
      name,
      updated_at: new Date(),
    },
    create: {
      name,
      path,
    },
  });
  const capabilities = await buildCapabilities(project.path);
  return transformProject(project, capabilities);
}
