import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

/**
 * Global Setup for E2E Tests
 *
 * Responsibilities:
 * 1. Clean up old e2e.db
 * 2. Run Prisma migrations on e2e.db
 * 3. Verify E2E server health
 *
 * Assumes: E2E server (5100/5101) is already running
 */

export default async function globalSetup() {
  console.log("\n🔧 E2E Global Setup Starting...");

  const e2eDbPath = join(__dirname, "..", "e2e.db");
  const databaseUrl = `file:./e2e.db`;

  // 1. Clean up old database
  if (existsSync(e2eDbPath)) {
    console.log("🗑️  Removing old e2e.db...");
    unlinkSync(e2eDbPath);

    // Also remove journal files
    ["-shm", "-wal", "-journal"].forEach((ext) => {
      const journalPath = `${e2eDbPath}${ext}`;
      if (existsSync(journalPath)) {
        unlinkSync(journalPath);
      }
    });
  }

  // 2. Run Prisma migrations
  console.log("📦 Running Prisma migrations on e2e.db...");
  try {
    execSync("pnpm prisma migrate deploy", {
      cwd: join(__dirname, ".."),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      stdio: "inherit",
    });
    console.log("✅ Database migrations complete");
  } catch (error) {
    console.error("❌ Failed to run migrations:", error);
    throw error;
  }

  // 3. Verify E2E server health
  console.log("🏥 Checking E2E server health...");
  const maxRetries = 30;
  const retryDelay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch("http://localhost:5100/api/health");
      if (response.ok) {
        console.log("✅ E2E server is healthy");
        console.log("🚀 E2E Global Setup Complete\n");
        return;
      }
    } catch (error) {
      // Server not ready yet
    }

    if (i < maxRetries - 1) {
      console.log(
        `⏳ Waiting for E2E server... (${i + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(
    "❌ E2E server health check failed. Make sure 'pnpm e2e:server' is running."
  );
}
