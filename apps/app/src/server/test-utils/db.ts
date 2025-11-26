import { PrismaClient } from "@prisma/client";
import { prisma } from "@/shared/prisma";

/**
 * Cleans all tables in test database
 * - Truncates tables in correct order (respects foreign keys)
 * - Preserves schema (faster than resetTestDB)
 * - Use between tests to ensure clean state
 */
export async function cleanTestDB(prisma: PrismaClient): Promise<void> {
  // Delete in order to respect foreign key constraints
  // Leaf nodes first, then tables they reference
  await prisma.workflowArtifact.deleteMany();
  await prisma.workflowEvent.deleteMany();
  await prisma.workflowRunStep.deleteMany();
  await prisma.workflowRun.deleteMany();
  await prisma.workflowDefinition.deleteMany();
  await prisma.agentSession.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Get the current test Prisma instance (singleton)
 */
export function getTestPrisma(): PrismaClient {
  return prisma;
}
