import { existsSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Global Teardown for E2E Tests
 *
 * Responsibilities:
 * 1. Clean up e2e.db after all tests complete
 * 2. Remove journal files (SQLite WAL mode artifacts)
 */

export default async function globalTeardown() {
  const e2eDbPath = join(__dirname, "..", "e2e.db");

  // Remove e2e.db and journal files
  const removed = [e2eDbPath, `${e2eDbPath}-shm`, `${e2eDbPath}-wal`, `${e2eDbPath}-journal`]
    .filter((path) => existsSync(path));

  removed.forEach((path) => unlinkSync(path));

  if (removed.length > 0) {
    console.log(`[E2E Teardown] ✓ Cleaned ${removed.length} file(s)\n`);
  } else {
    console.log("[E2E Teardown] ✓ Complete\n");
  }
}
