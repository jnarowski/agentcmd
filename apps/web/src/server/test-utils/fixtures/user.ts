import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import type { JWTPayload } from "@/server/utils/auth";

/**
 * Default password for test users
 */
const DEFAULT_PASSWORD = "testpassword123";

/**
 * Creates a test user with hashed password
 * @param prisma - Prisma client instance
 * @param overrides - Optional fields to override defaults
 * @returns Created user (without password_hash)
 */
export async function createTestUser(
  prisma: PrismaClient,
  overrides?: Partial<{
    email: string;
    password: string;
    is_active: boolean;
  }>
) {
  const email = overrides?.email || "test@example.com";
  const password = overrides?.password || DEFAULT_PASSWORD;
  const is_active = overrides?.is_active ?? true;

  // Hash password with same salt rounds as production
  const saltRounds = 12;
  const password_hash = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password_hash,
      is_active,
      last_login: new Date(),
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      last_login: true,
      is_active: true,
    },
  });

  return user;
}

/**
 * Creates a valid JWT token for testing authenticated requests
 * @param userId - User ID to encode in token
 * @param email - User email to encode in token
 * @param fastify - Fastify instance with JWT plugin (required)
 * @returns JWT token string
 */
export function createAuthToken(
  userId: string,
  email: string,
  fastify: FastifyInstance
): string {
  // Use Fastify's JWT plugin to sign token
  return fastify.jwt.sign({
    userId,
    email,
  } as JWTPayload);
}

/**
 * Creates a test user with authentication token and headers
 * Combines createTestUser() + createAuthToken() + header formatting
 * @param prisma - Prisma client instance
 * @param app - Fastify instance with JWT plugin
 * @param overrides - Optional fields to override defaults
 * @returns Object with user, token, and authorization headers
 */
export async function createAuthenticatedUser(
  prisma: PrismaClient,
  app: FastifyInstance & { jwt: { sign: (payload: object) => string } },
  overrides?: { email?: string; password?: string; is_active?: boolean }
): Promise<{
  user: { id: string; email: string; created_at: Date; last_login: Date | null; is_active: boolean };
  token: string;
  headers: { authorization: string };
}> {
  const user = await createTestUser(prisma, overrides);
  const token = createAuthToken(user.id, user.email, app);
  const headers = { authorization: `Bearer ${token}` };
  return { user, token, headers };
}
