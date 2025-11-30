import { existsSync, unlinkSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Global Teardown for E2E Tests
 *
 * Responsibilities:
 * 1. Clean up fixture project from database and filesystem
 * 2. Clean up e2e.db after all tests complete
 * 3. Remove journal files (SQLite WAL mode artifacts)
 */

export default async function globalTeardown() {
  const e2eDbPath = join(__dirname, "..", "prisma", "e2e.db");

  // 1. Clean up fixture project if it was created
  if (process.env.E2E_WORKFLOW_PROJECT_ID || process.env.E2E_WORKFLOW_PROJECT_PATH) {
    const adapter = new PrismaBetterSqlite3({
      url: `file:${e2eDbPath}`,
    });
    const prisma = new PrismaClient({ adapter });

    try {
      // Delete project from database (cascades to workflow definitions, runs, etc.)
      if (process.env.E2E_WORKFLOW_PROJECT_ID) {
        await prisma.project.delete({
          where: { id: process.env.E2E_WORKFLOW_PROJECT_ID },
        }).catch(() => {
          // Ignore errors if project already deleted
        });
      }

      // Remove temp directory
      if (process.env.E2E_WORKFLOW_PROJECT_PATH && existsSync(process.env.E2E_WORKFLOW_PROJECT_PATH)) {
        rmSync(process.env.E2E_WORKFLOW_PROJECT_PATH, { recursive: true, force: true });
      }

      console.log("[E2E Teardown] ✓ Fixture project cleaned");
    } finally {
      await prisma.$disconnect();
    }
  }

  // 2. Remove e2e.db and journal files
  const removed = [e2eDbPath, `${e2eDbPath}-shm`, `${e2eDbPath}-wal`, `${e2eDbPath}-journal`]
    .filter((path) => existsSync(path));

  removed.forEach((path) => unlinkSync(path));

  if (removed.length > 0) {
    console.log(`[E2E Teardown] ✓ Cleaned ${removed.length} file(s)\n`);
  } else {
    console.log("[E2E Teardown] ✓ Complete\n");
  }
}
