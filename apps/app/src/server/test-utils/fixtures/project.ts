import { PrismaClient } from "@prisma/client";

/**
 * Creates a test project
 * @param prisma - Prisma client instance
 * @param overrides - Optional fields to override defaults
 * @returns Created project
 */
export async function createTestProject(
  prisma: PrismaClient,
  overrides?: Partial<{
    name: string;
    path: string;
    is_hidden: boolean;
    is_starred: boolean;
  }>
) {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const name = overrides?.name || `Test Project ${uniqueId}`;
  const path = overrides?.path || `/tmp/test-project-${uniqueId}`;
  const is_hidden = overrides?.is_hidden ?? false;
  const is_starred = overrides?.is_starred ?? false;

  const project = await prisma.project.create({
    data: {
      name,
      path,
      is_hidden,
      is_starred,
    },
  });

  return project;
}
