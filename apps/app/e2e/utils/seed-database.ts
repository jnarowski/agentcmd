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
  userId: string;
  name: string;
  path: string;
  description?: string;
}

export interface SeedSessionOptions {
  userId: string;
  projectId: string;
  name: string;
  state?: "active" | "completed" | "error";
}

export interface SeedMessageOptions {
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
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
 * Seed a project in the database
 */
export async function seedProject(
  prisma: PrismaClient,
  options: SeedProjectOptions
) {
  return prisma.project.create({
    data: {
      name: options.name,
      path: options.path,
      description: options.description || null,
      user_id: options.userId,
    },
  });
}

/**
 * Seed a session in the database
 */
export async function seedSession(
  prisma: PrismaClient,
  options: SeedSessionOptions
) {
  return prisma.session.create({
    data: {
      name: options.name,
      state: options.state || "active",
      user_id: options.userId,
      project_id: options.projectId,
    },
  });
}

/**
 * Seed a message in the database
 */
export async function seedMessage(
  prisma: PrismaClient,
  options: SeedMessageOptions
) {
  return prisma.message.create({
    data: {
      session_id: options.sessionId,
      role: options.role,
      content: options.content,
    },
  });
}

/**
 * Cleanup all test data for a user
 * Deletes in order: messages -> sessions -> projects -> user
 */
export async function cleanupUserData(prisma: PrismaClient, userId: string) {
  // Get user's sessions
  const sessions = await prisma.session.findMany({
    where: { user_id: userId },
    select: { id: true },
  });

  const sessionIds = sessions.map((s) => s.id);

  // Delete messages in user's sessions
  if (sessionIds.length > 0) {
    await prisma.message.deleteMany({
      where: { session_id: { in: sessionIds } },
    });
  }

  // Delete user's sessions
  await prisma.session.deleteMany({
    where: { user_id: userId },
  });

  // Delete user's projects
  await prisma.project.deleteMany({
    where: { user_id: userId },
  });

  // Delete user
  await prisma.user.delete({
    where: { id: userId },
  });
}
