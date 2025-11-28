/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/prisma";
import type { Project, ProjectCapabilities, ProjectPreviewConfig } from "@/shared/types/project.types";
import { isGitRepository } from "@/server/domain/git/services/isGitRepository";
import { checkWorkflowPackage } from "@/server/domain/project/services/checkWorkflowPackage";
import type { UpdateProjectOptions } from "@/server/domain/project/types";

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
 * Update an existing project
 * @param options - Project update options
 * @returns Updated project or null if not found
 */
export async function updateProject({
  id,
  data
}: UpdateProjectOptions): Promise<Project | null> {
  try {
    // Destructure to exclude preview_config from spread (needs special handling)
    const { preview_config, ...restData } = data;

    // Build update data without preview_config
    const updateData: Prisma.ProjectUpdateInput = {
      ...restData,
      ...(data.name && { name: data.name.trim() }),
      ...(data.path && { path: data.path.trim() }), // Trim path to prevent trailing/leading whitespace bugs
    };

    // Prisma requires DbNull for setting JSON fields to null
    if (preview_config === null) {
      updateData.preview_config = Prisma.DbNull;
    } else if (preview_config !== undefined) {
      updateData.preview_config = preview_config as Prisma.InputJsonValue;
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });
    const capabilities = await buildCapabilities(project.path);
    return transformProject(project, capabilities);
  } catch (error) {
    // Return null if project not found
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return null;
      }
    }
    throw error;
  }
}
