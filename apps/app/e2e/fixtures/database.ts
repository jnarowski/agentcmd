import { test as base } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  seedProject,
  seedSession,
  type SeedProjectOptions,
  type SeedSessionOptions,
} from "../utils/seed-database";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Absolute path to e2e.db - ensures test and server use same database
const E2E_DATABASE_PATH = join(__dirname, "..", "..", "prisma", "e2e.db");
const E2E_DATABASE_URL = `file:${E2E_DATABASE_PATH}`;

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
    seedProject: (options: SeedProjectOptions) => ReturnType<typeof seedProject>;
    seedProjects: (options: SeedProjectOptions[]) => Promise<Awaited<ReturnType<typeof seedProject>>[]>;
    seedSession: (options: SeedSessionOptions) => ReturnType<typeof seedSession>;
    seedSessions: (options: SeedSessionOptions[]) => Promise<Awaited<ReturnType<typeof seedSession>>[]>;
  };
}

export const test = base.extend<DatabaseFixtures>({
  // prisma fixture: shared PrismaClient instance
  prisma: async ({}, use) => {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: E2E_DATABASE_URL,
        },
      },
    });

    await use(prisma);

    await prisma.$disconnect();
  },

  // db fixture: seeding helpers
  db: async ({ prisma }, use) => {
    const db = {
      seedProject: (options: SeedProjectOptions) => {
        return seedProject(prisma, options);
      },
      seedProjects: async (options: SeedProjectOptions[]) => {
        return Promise.all(options.map((opt) => seedProject(prisma, opt)));
      },
      seedSession: (options: SeedSessionOptions) => {
        return seedSession(prisma, options);
      },
      seedSessions: async (options: SeedSessionOptions[]) => {
        return Promise.all(options.map((opt) => seedSession(prisma, opt)));
      },
    };

    await use(db);
  },
});

export { expect } from "@playwright/test";
