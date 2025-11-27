import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { MAX_WORKERS } from "./vitest.config";

/**
 * Vitest globalSetup - runs ONCE before all test suites
 *
 * Responsibilities:
 * - Create worker-specific test databases
 * - Apply Prisma schema to each worker database
 * - Verify database connectivity
 *
 * Worker-per-database approach:
 * - Creates separate SQLite database per worker (test-worker-1.db, test-worker-2.db, etc.)
 * - Enables true parallel test execution without SQLITE_BUSY errors
 * - Each worker gets isolated database using VITEST_POOL_ID
 * - Worker count matches maxWorkers from vitest.config.ts (2 in CI, 4 locally)
 */
export default async function globalSetup() {
  console.log("🔧 Global Setup: Creating worker databases...");

  const workerCount = MAX_WORKERS;
  const cwd = process.cwd();

  // Switch between approaches here:
  // - 'individual' = simpler, run prisma push N times (default)
  // - 'template' = create once + copy (may be slower with many workers)
  const USE_APPROACH = process.env.TEST_DB_APPROACH || "template";

  try {
    if (USE_APPROACH === "individual") {
      await createDatabasesIndividually(workerCount, cwd);
    } else {
      await createDatabasesFromTemplate(workerCount, cwd);
    }

    console.log("✅ Global Setup: All worker databases ready");
  } catch (error) {
    console.error("❌ Global Setup: Failed to create worker databases");
    throw new Error(
      `Failed to setup test databases: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // Return teardown function (runs after all tests complete)
  return async () => {
    console.log("🧹 Global Teardown: Cleaning up...");

    // Disconnect Prisma (dynamic import to avoid circular deps)
    const { prisma } = await import("./src/shared/prisma");
    await prisma.$disconnect();

    const workerCount = MAX_WORKERS;
    const cwd = process.cwd();

    try {
      // Clean up template database
      const templateFiles = [
        path.resolve(cwd, "test-template.db"),
        path.resolve(cwd, "test-template.db-wal"),
        path.resolve(cwd, "test-template.db-shm"),
      ];
      for (const file of templateFiles) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }

      // Clean up all worker database files
      for (let i = 1; i <= workerCount; i++) {
        const dbFilePath = path.resolve(cwd, `test-worker-${i}.db`);
        const dbFilePathWal = path.resolve(cwd, `test-worker-${i}.db-wal`);
        const dbFilePathShm = path.resolve(cwd, `test-worker-${i}.db-shm`);

        if (fs.existsSync(dbFilePath)) {
          fs.unlinkSync(dbFilePath);
        }
        if (fs.existsSync(dbFilePathWal)) {
          fs.unlinkSync(dbFilePathWal);
        }
        if (fs.existsSync(dbFilePathShm)) {
          fs.unlinkSync(dbFilePathShm);
        }
      }
      console.log("✅ Removed all database files");
    } catch (error) {
      console.warn(
        "⚠️  Failed to clean up test database files:",
        error instanceof Error ? error.message : String(error)
      );
    }
  };
}

/**
 * Approach 1: Create databases individually (original approach)
 * Runs `prisma db push` N times (once per worker)
 */
async function createDatabasesIndividually(workerCount: number, cwd: string) {
  console.log(`   Creating ${workerCount} databases individually...`);

  for (let i = 1; i <= workerCount; i++) {
    const workerFile = path.resolve(cwd, `test-worker-${i}.db`);
    const workerDbPath = `file:${workerFile}`;

    // Don't spread process.env to avoid .env file interference
    const env = { ...process.env };
    delete env.DATABASE_URL; // Remove any existing DATABASE_URL
    env.DATABASE_URL = workerDbPath; // Set our test database URL
    env.PRISMA_SKIP_DOTENV_LOAD = "1"; // Prisma 7: prevent auto .env loading

    execSync("pnpm prisma db push --accept-data-loss", {
      stdio: "pipe",
      cwd,
      env,
    });
  }
}

/**
 * Approach 2: Create from template (optimized approach)
 * Runs `prisma db push` once, then copies the file N times
 */
async function createDatabasesFromTemplate(workerCount: number, cwd: string) {
  console.log(`   Creating template database...`);
  const templateFile = path.resolve(cwd, "test-template.db");
  const templateDbPath = `file:${templateFile}`;

  // Don't spread process.env to avoid .env file interference
  const env = { ...process.env };
  delete env.DATABASE_URL; // Remove any existing DATABASE_URL
  env.DATABASE_URL = templateDbPath; // Set our test database URL
  env.PRISMA_SKIP_DOTENV_LOAD = "1"; // Prisma 7: prevent auto .env loading

  execSync("pnpm prisma db push --accept-data-loss", {
    stdio: "pipe",
    cwd,
    env,
  });

  // Verify template was created
  if (!fs.existsSync(templateFile)) {
    throw new Error(`Template database not created at ${templateFile}`);
  }
  console.log(`   ✅ Template created, copying to ${workerCount} workers...`);

  // Copy template to all worker databases
  for (let i = 1; i <= workerCount; i++) {
    const workerFile = path.resolve(cwd, `test-worker-${i}.db`);
    fs.copyFileSync(templateFile, workerFile);
  }
}
