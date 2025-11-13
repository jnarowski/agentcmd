import { execSync } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Vitest globalSetup - runs ONCE before all test suites
 *
 * Responsibilities:
 * - Set test DATABASE_URL
 * - Apply Prisma schema to test database
 * - Verify database connectivity
 *
 * Note: This runs BEFORE vitest.setup.ts, so we must set DATABASE_URL here
 *
 * File-based DB approach (current):
 * - Uses temp file for SQLite database
 * - Allows parallel test execution across multiple workers
 * - Tests run concurrently on multi-core systems
 * - Trade-off: File I/O overhead (minimal on SSD)
 */
export default async function globalSetup() {
  console.log("🔧 Global Setup: Applying Prisma schema to test database...");

  // File-based DB for parallel test execution
  const testDbPath = "file:./test-temp.db";
  process.env.DATABASE_URL = testDbPath;

  try {
    // Apply schema (skip generate - client already generated during install)
    // Use --accept-data-loss since this is a test database
    execSync("pnpm prisma db push --skip-generate --accept-data-loss", {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: testDbPath },
    });

    console.log("✅ Global Setup: Schema applied successfully");
  } catch (error) {
    console.error("❌ Global Setup: Failed to apply schema");
    throw new Error(
      `Failed to setup test database: ${
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

    // Clean up test database file
    const dbFilePath = path.resolve(process.cwd(), "test-temp.db");
    const dbFilePathWal = path.resolve(process.cwd(), "test-temp.db-wal");
    const dbFilePathShm = path.resolve(process.cwd(), "test-temp.db-shm");

    try {
      if (fs.existsSync(dbFilePath)) {
        fs.unlinkSync(dbFilePath);
        console.log("✅ Removed test database file");
      }
      if (fs.existsSync(dbFilePathWal)) {
        fs.unlinkSync(dbFilePathWal);
      }
      if (fs.existsSync(dbFilePathShm)) {
        fs.unlinkSync(dbFilePathShm);
      }
    } catch (error) {
      console.warn(
        "⚠️  Failed to clean up test database files:",
        error instanceof Error ? error.message : String(error)
      );
    }
  };
}
