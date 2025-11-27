import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

/**
 * Global Teardown for E2E Tests
 *
 * Responsibilities:
 * 1. Clean up e2e.db after all tests complete
 * 2. Remove journal files (SQLite WAL mode artifacts)
 */

export default async function globalTeardown() {
  console.log("\n🧹 E2E Global Teardown Starting...");

  const e2eDbPath = join(__dirname, "..", "e2e.db");

  // Remove e2e.db and journal files
  [e2eDbPath, `${e2eDbPath}-shm`, `${e2eDbPath}-wal`, `${e2eDbPath}-journal`]
    .filter((path) => existsSync(path))
    .forEach((path) => {
      console.log(`🗑️  Removing ${path.split("/").pop()}...`);
      unlinkSync(path);
    });

  console.log("✅ E2E Global Teardown Complete\n");
}
