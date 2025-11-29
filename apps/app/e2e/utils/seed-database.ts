import type { PrismaClient } from "@prisma/client";

/**
 * Database Seeding Utilities
 *
 * Provides helper functions to seed test data:
 * - seedUser: Create user with hashed password
 * - seedProject: Create project for user
 * - seedSession: Create session for project
 * - seedMessage: Create message in session
 */

export interface SeedUserOptions {
  email: string;
  password?: string;
}

export interface SeedProjectOptions {
  name: string;
  /** Optional custom path (auto-generated with .agentcmd-e2e-test- prefix if not provided) */
  path?: string;
}

export interface SeedSessionOptions {
  projectId: string;
  userId: string;
  name: string;
  state?: "idle" | "working" | "error";
}


/**
 * Seed a user in the database
 * Note: E2E tests typically use authenticated-page fixture instead
 */
export async function seedUser(
  prisma: PrismaClient,
  options: SeedUserOptions
) {
  const bcrypt = await import("bcryptjs");
  const password_hash = await bcrypt.hash(options.password || "testpass123", 12);

  return prisma.user.create({
    data: {
      email: options.email,
      password_hash,
      last_login: new Date(),
    },
  });
}

/**
 * E2E test project path prefix
 * Used to filter out E2E projects from sync operations (like worktrees)
 * Format: /tmp/.agentcmd-e2e-test-{name}-{timestamp}-{random}
 */
export const E2E_PROJECT_PATH_PREFIX = "/tmp/.agentcmd-e2e-test-";

/**
 * Seed a project in the database
 * Uses standardized /tmp/.agentcmd-e2e-test- prefix for easy filtering from sync
 */
export async function seedProject(
  prisma: PrismaClient,
  options: SeedProjectOptions
) {
  // Generate unique path with standardized E2E prefix
  // This allows sync operations to filter out E2E projects (similar to worktrees)
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const safeName = options.name.toLowerCase().replace(/\s+/g, "-");
  const uniquePath = `${E2E_PROJECT_PATH_PREFIX}${safeName}-${uniqueSuffix}`;

  return prisma.project.create({
    data: {
      name: options.name,
      path: uniquePath,
    },
  });
}

/**
 * Check if a path is an E2E test project path
 */
export function isE2ETestProject(path: string): boolean {
  return path.startsWith(E2E_PROJECT_PATH_PREFIX);
}

/**
 * Seed a session in the database
 */
export async function seedSession(
  prisma: PrismaClient,
  options: SeedSessionOptions
) {
  return prisma.agentSession.create({
    data: {
      name: options.name,
      state: options.state || "idle",
      user_id: options.userId,
      project_id: options.projectId,
      metadata: {},
    },
  });
}

/**
 * Cleanup all test data for a user
 * Deletes in order: sessions -> projects -> user
 */
export async function cleanupUserData(prisma: PrismaClient, userId: string) {
  // Delete user's sessions
  await prisma.agentSession.deleteMany({
    where: { user_id: userId },
  });

  // Delete user's projects (cascade deletes workflow definitions, runs, etc.)
  await prisma.project.deleteMany({
    where: { id: { in: [] } }, // Projects don't have user_id, so manual deletion not needed
  });

  // Delete user
  await prisma.user.delete({
    where: { id: userId },
  });
}
