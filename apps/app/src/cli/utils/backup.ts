import { copyFileSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { PRISMA_VERSION } from "./constants";

/**
 * Check if there are pending Prisma migrations
 * @param schemaPath Path to the Prisma schema file
 * @returns Array of pending migration names
 */
export function checkPendingMigrations(schemaPath: string): string[] {
  const result = spawnSync(
    "npx",
    [PRISMA_VERSION, "migrate", "status", "--schema", schemaPath],
    {
      encoding: "utf-8",
      cwd: dirname(schemaPath),
      env: {
        ...process.env,
        PRISMA_SKIP_DOTENV_LOAD: "1", // Prisma 7: prevent auto .env loading
      },
    }
  );

  // Prisma outputs migration status to stdout
  const output = result.stdout || "";

  // Parse output for pending migrations
  // Example line: "  ✓ 20240101000000_init"
  // Example pending: "  ⚠ 20240102000000_add_field (pending)"
  const lines = output.split("\n");
  const pending: string[] = [];

  for (const line of lines) {
    if (line.includes("(pending)") || line.includes("following migration")) {
      // Extract migration name
      const match = line.match(/\d{14}_[\w-]+/);
      if (match) {
        pending.push(match[0]);
      }
    }
  }

  // Also check exit code - non-zero usually means pending migrations or error
  // Exit code 0 = all migrations applied
  // Exit code 1 = pending migrations or error
  if (result.status !== 0 && !output.includes("Database schema is up to date")) {
    // If we couldn't parse specific migrations but status is non-zero
    // and it's not just "up to date", assume there are pending migrations
    if (pending.length === 0 && output.toLowerCase().includes("migration")) {
      return ["unknown-pending-migration"];
    }
  }

  return pending;
}

/**
 * Create a timestamped backup of the database file
 * @param dbPath Path to the database file
 * @returns Path to the created backup file
 */
export function createBackup(dbPath: string): string {
  if (!existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath}`);
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, ""); // Format: 2025-01-15T10-30-00

  const backupPath = `${dbPath}.${timestamp}.backup`;

  copyFileSync(dbPath, backupPath);

  return backupPath;
}

/**
 * Clean up old backups, keeping only the most recent N backups
 * @param dbPath Path to the database file
 * @param keep Number of backups to keep (default: 3)
 */
export function cleanupOldBackups(dbPath: string, keep: number = 3): void {
  const dir = dirname(dbPath);
  const filename = dbPath.split("/").pop() || "";

  if (!existsSync(dir)) {
    return;
  }

  // Find all backup files
  const files = readdirSync(dir);
  const backupPattern = new RegExp(`^${filename}\\.\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}\\.backup$`);
  const backups = files
    .filter((file) => backupPattern.test(file))
    .map((file) => ({
      name: file,
      path: join(dir, file),
      mtime: statSync(join(dir, file)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Sort newest first

  // Remove old backups (keep only the most recent N)
  const toDelete = backups.slice(keep);
  for (const backup of toDelete) {
    try {
      unlinkSync(backup.path);
    } catch {
      // Ignore errors when deleting old backups
      console.warn(`Failed to delete old backup: ${backup.name}`);
    }
  }
}
