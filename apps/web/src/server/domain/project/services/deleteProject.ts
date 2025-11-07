/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/prisma";
import type { Project } from "@/shared/types/project.types";
import { getCurrentBranch } from "@/server/domain/git/services/getCurrentBranch";
import type { DeleteProjectOptions } from "@/server/domain/project/types/DeleteProjectOptions";

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
 * Delete a project
 * @param options - Options object with id
 * @returns Deleted project or null if not found
 */
export async function deleteProject({ id }: DeleteProjectOptions): Promise<Project | null> {
  try {
    const project = await prisma.project.delete({
      where: { id },
    });
    const currentBranch = await getCurrentBranch({ projectPath: project.path });
    return transformProject(project, currentBranch);
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
