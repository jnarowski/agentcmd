import { test as base } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import {
  seedProject,
  seedSession,
  seedMessage,
  type SeedProjectOptions,
  type SeedSessionOptions,
  type SeedMessageOptions,
} from "../utils/seed-database";

/**
 * Database Fixture
 *
 * Provides:
 * - prisma: PrismaClient connected to e2e.db
 * - db: Seeding helpers (project, session, message)
 *
 * Usage:
 * test('my test', async ({ db, testUser }) => {
 *   const project = await db.seedProject({
 *     userId: testUser.id,
 *     name: 'Test Project',
 *     path: '/tmp/test'
 *   });
 * });
 */

export interface DatabaseFixtures {
  prisma: PrismaClient;
  db: {
    seedProject: (options: Omit<SeedProjectOptions, "userId">) => Promise<ReturnType<typeof seedProject>>;
    seedSession: (options: Omit<SeedSessionOptions, "userId">) => Promise<ReturnType<typeof seedSession>>;
    seedMessage: (options: SeedMessageOptions) => Promise<ReturnType<typeof seedMessage>>;
  };
}

export const test = base.extend<DatabaseFixtures>({
  // prisma fixture: shared PrismaClient instance
  prisma: async ({}, use) => {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: "file:./e2e.db",
        },
      },
    });

    await use(prisma);

    await prisma.$disconnect();
  },

  // db fixture: seeding helpers bound to testUser
  db: async ({ prisma }, use, testInfo) => {
    // Extract testUser from test context if available
    // @ts-ignore - testUser may not be available in all tests
    const testUser = testInfo.project.use?.testUser;

    const db = {
      seedProject: (options: Omit<SeedProjectOptions, "userId">) => {
        if (!testUser?.id) {
          throw new Error(
            "testUser not available. Use authenticatedPage fixture to get testUser."
          );
        }
        return seedProject(prisma, { ...options, userId: testUser.id });
      },
      seedSession: (options: Omit<SeedSessionOptions, "userId">) => {
        if (!testUser?.id) {
          throw new Error(
            "testUser not available. Use authenticatedPage fixture to get testUser."
          );
        }
        return seedSession(prisma, { ...options, userId: testUser.id });
      },
      seedMessage: (options: SeedMessageOptions) => {
        return seedMessage(prisma, options);
      },
    };

    await use(db);
  },
});

export { expect } from "@playwright/test";
