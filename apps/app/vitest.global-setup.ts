import { execSync } from "child_process";

/**
 * Vitest globalSetup - runs ONCE before all test suites
 *
 * Responsibilities:
 * - Set test DATABASE_URL
 * - Apply Prisma schema to test database
 * - Verify database connectivity
 *
 * Note: This runs BEFORE vitest.setup.ts, so we must set DATABASE_URL here
 */
export default async function globalSetup() {
  console.log("🔧 Global Setup: Applying Prisma schema to test database...");

  // Set test database URL (runs before vitest.setup.ts)
  const testDbPath = "file::memory:?cache=shared";
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

    // Delete test database file
    try {
      const fs = await import("fs/promises");
      await fs.unlink("./test-temp.db");
      console.log("✅ Global Teardown: Test database deleted");
    } catch {
      // Ignore if file doesn't exist
    }
  };
}
