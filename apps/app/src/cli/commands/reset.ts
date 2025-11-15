import { existsSync, unlinkSync, readdirSync } from "node:fs";
import { join, dirname } from "path";
import { getDbPath } from "../utils/paths";

interface ResetOptions {
  force?: boolean;
  keepBackups?: boolean;
}

export async function resetCommand(options: ResetOptions): Promise<void> {
  const dbPath = getDbPath();
  const dbDir = dirname(dbPath);

  // Safety check - require --force flag
  if (!options.force) {
    console.error("❌ ERROR: This will delete the database and all data!");
    console.error("Use --force to confirm: agentcmd reset --force");
    process.exit(1);
  }

  console.log("Resetting CLI database...");

  // Delete main database
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
    console.log(`✓ Deleted database: ${dbPath}`);
  } else {
    console.log("Database does not exist, nothing to delete");
  }

  // Delete backup files unless --keep-backups is specified
  if (!options.keepBackups) {
    try {
      const files = readdirSync(dbDir);
      const backups = files.filter(f => f.startsWith("database.db.") && f.endsWith(".backup"));

      for (const backup of backups) {
        const backupPath = join(dbDir, backup);
        unlinkSync(backupPath);
      }

      if (backups.length > 0) {
        console.log(`✓ Deleted ${backups.length} backup file(s)`);
      }
    } catch (error) {
      console.warn("Warning: Could not delete backup files:", error instanceof Error ? error.message : error);
    }
  }

  console.log("");
  console.log("✓ Database reset complete");
  console.log("Run 'agentcmd start' to create a fresh database");
}
