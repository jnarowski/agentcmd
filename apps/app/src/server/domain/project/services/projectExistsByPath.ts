import { prisma } from "@/shared/prisma";
import type { ProjectExistsByPathOptions } from "@/server/domain/project/types/ProjectExistsByPathOptions";

/**
 * Check if a project exists by path
 * @param options - Options object with path
 * @returns True if project exists
 */
export async function projectExistsByPath({ path }: ProjectExistsByPathOptions): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { path },
  });
  return project !== null;
}
