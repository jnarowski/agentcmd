import { test as base } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  seedProject,
  seedSession,
  seedTestProject,
  seedWorkflowDefinition,
  seedSpecFile,
  seedFileChange,
  type SeedProjectOptions,
  type SeedSessionOptions,
  type SeedTestProjectOptions,
  type SeedWorkflowDefinitionOptions,
  type SeedSpecFileOptions,
} from "../utils/seed-database";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Absolute path to e2e.db - ensures test and server use same database
const E2E_DATABASE_PATH = join(__dirname, "..", "..", "prisma", "e2e.db");

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
    seedTestProject: (options?: SeedTestProjectOptions) => ReturnType<typeof seedTestProject>;
    seedWorkflowDefinition: (options: SeedWorkflowDefinitionOptions) => ReturnType<typeof seedWorkflowDefinition>;
    seedSpecFile: (projectPath: string, options?: SeedSpecFileOptions) => ReturnType<typeof seedSpecFile>;
    seedFileChange: (projectPath: string, filename: string, content: string) => ReturnType<typeof seedFileChange>;
  };
}

export const test = base.extend<DatabaseFixtures>({
  // prisma fixture: shared PrismaClient instance
  // Prisma 7: SQLite requires the better-sqlite3 adapter
  // eslint-disable-next-line no-empty-pattern
  prisma: async ({}, use) => {
    const adapter = new PrismaBetterSqlite3({
      url: `file:${E2E_DATABASE_PATH}`,
    });
    const prisma = new PrismaClient({ adapter });

    // eslint-disable-next-line react-hooks/rules-of-hooks
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
      seedTestProject: (options?: SeedTestProjectOptions) => {
        return seedTestProject(prisma, options);
      },
      seedWorkflowDefinition: (options: SeedWorkflowDefinitionOptions) => {
        return seedWorkflowDefinition(prisma, options);
      },
      seedSpecFile: (projectPath: string, options?: SeedSpecFileOptions) => {
        return seedSpecFile(projectPath, options);
      },
      seedFileChange: (projectPath: string, filename: string, content: string) => {
        return seedFileChange(projectPath, filename, content);
      },
    };

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(db);
  },
});

export { expect } from "@playwright/test";
