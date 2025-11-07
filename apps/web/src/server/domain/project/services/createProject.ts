/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/shared/prisma";
import type { Project } from "@/shared/types/project.types";
import { getCurrentBranch } from "@/server/domain/git/services/getCurrentBranch";
import type { CreateProjectOptions } from "@/server/domain/project/types";

/**
 * Transform Prisma project to API project format
 * @param prismaProject - Raw project from Prisma
 * @param currentBranch - Optional git branch (fetched separately)
 */
function transformProject(
  prismaProject: any,
  currentBranch?: string | null
): Project {
  return {
    id: prismaProject.id,
    name: prismaProject.name,
    path: prismaProject.path,
    is_hidden: prismaProject.is_hidden,
    is_starred: prismaProject.is_starred,
    created_at: prismaProject.created_at,
    updated_at: prismaProject.updated_at,
    current_branch: currentBranch ?? undefined,
  };
}

/**
 * Create a new project
 * @param options - Project creation options
 * @returns Created project
 */
export async function createProject({
  data
}: CreateProjectOptions): Promise<Project> {
  const project = await prisma.project.create({
    data: {
      name: data.name.trim(),
      path: data.path,
    },
  });
  const currentBranch = await getCurrentBranch({ projectPath: project.path });
  return transformProject(project, currentBranch);
}
