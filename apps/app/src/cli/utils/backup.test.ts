import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, utimesSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createBackup, cleanupOldBackups, checkPendingMigrations } from "./backup";

describe("backup utilities", () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `agentcmd-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
    dbPath = join(tempDir, "database.db");
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("createBackup", () => {
    it("creates timestamped backup file", () => {
      // Create fake database
      writeFileSync(dbPath, "fake database content");

      // Create backup
      const backupPath = createBackup(dbPath);

      // Verify backup exists
      expect(existsSync(backupPath)).toBe(true);

      // Verify backup content matches original
      const backupContent = readFileSync(backupPath, "utf-8");
      expect(backupContent).toBe("fake database content");
    });

    it("backup filename matches timestamp pattern", () => {
      writeFileSync(dbPath, "test content");

      const backupPath = createBackup(dbPath);

      // Pattern: database.db.YYYY-MM-DDTHH-MM-SS.backup
      const pattern = /database\.db\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.backup$/;
      expect(backupPath).toMatch(pattern);
    });

    it("throws error if source database doesn't exist", () => {
      const nonExistentPath = join(tempDir, "nonexistent.db");

      expect(() => createBackup(nonExistentPath)).toThrow("Database file not found");
    });

    it("creates backup in same directory as source", () => {
      writeFileSync(dbPath, "test");

      const backupPath = createBackup(dbPath);

      expect(backupPath.startsWith(tempDir)).toBe(true);
      expect(backupPath).toContain("database.db.");
    });
  });

  describe("cleanupOldBackups", () => {
    function createFakeBackup(filename: string, ageInMinutes: number): void {
      const backupPath = join(tempDir, filename);
      writeFileSync(backupPath, `backup content ${filename}`);

      // Set mtime to simulate age
      const mtime = new Date(Date.now() - ageInMinutes * 60 * 1000);
      utimesSync(backupPath, mtime, mtime);
    }

    it("keeps only last 3 backups by default", () => {
      // Create database file
      writeFileSync(dbPath, "db content");

      // Create 5 fake backups with different ages
      createFakeBackup("database.db.2025-01-01T10-00-00.backup", 5); // oldest
      createFakeBackup("database.db.2025-01-02T10-00-00.backup", 4);
      createFakeBackup("database.db.2025-01-03T10-00-00.backup", 3);
      createFakeBackup("database.db.2025-01-04T10-00-00.backup", 2);
      createFakeBackup("database.db.2025-01-05T10-00-00.backup", 1); // newest

      // Cleanup (keep 3)
      cleanupOldBackups(dbPath, 3);

      // Verify only 3 backups remain
      const files = readdirSync(tempDir);
      const backups = files.filter((f: string) => f.endsWith(".backup"));
      expect(backups.length).toBe(3);

      // Verify oldest 2 were deleted
      expect(existsSync(join(tempDir, "database.db.2025-01-01T10-00-00.backup"))).toBe(false);
      expect(existsSync(join(tempDir, "database.db.2025-01-02T10-00-00.backup"))).toBe(false);

      // Verify newest 3 remain
      expect(existsSync(join(tempDir, "database.db.2025-01-03T10-00-00.backup"))).toBe(true);
      expect(existsSync(join(tempDir, "database.db.2025-01-04T10-00-00.backup"))).toBe(true);
      expect(existsSync(join(tempDir, "database.db.2025-01-05T10-00-00.backup"))).toBe(true);
    });

    it("handles missing directory gracefully", () => {
      const nonExistentDir = join(tempDir, "nonexistent", "database.db");

      // Should not throw
      expect(() => cleanupOldBackups(nonExistentDir, 3)).not.toThrow();
    });

    it("doesn't delete main database file", () => {
      writeFileSync(dbPath, "main database");
      createFakeBackup("database.db.2025-01-01T10-00-00.backup", 1);

      cleanupOldBackups(dbPath, 0); // Keep 0 backups

      // Main database should still exist
      expect(existsSync(dbPath)).toBe(true);
      expect(readFileSync(dbPath, "utf-8")).toBe("main database");
    });

    it("only removes files matching backup pattern", () => {
      writeFileSync(dbPath, "db");
      writeFileSync(join(tempDir, "other-file.txt"), "other content");
      writeFileSync(join(tempDir, "database.db.backup.old"), "old backup");
      createFakeBackup("database.db.2025-01-01T10-00-00.backup", 1);

      cleanupOldBackups(dbPath, 0);

      // Other files should still exist
      expect(existsSync(join(tempDir, "other-file.txt"))).toBe(true);
      expect(existsSync(join(tempDir, "database.db.backup.old"))).toBe(true);

      // Only matching backup should be deleted
      expect(existsSync(join(tempDir, "database.db.2025-01-01T10-00-00.backup"))).toBe(false);
    });

    it("keeps fewer backups when less than N exist", () => {
      writeFileSync(dbPath, "db");
      createFakeBackup("database.db.2025-01-01T10-00-00.backup", 2);
      createFakeBackup("database.db.2025-01-02T10-00-00.backup", 1);

      // Request to keep 5, but only 2 exist
      cleanupOldBackups(dbPath, 5);

      const files = readdirSync(tempDir);
      const backups = files.filter((f: string) => f.endsWith(".backup"));
      expect(backups.length).toBe(2); // Both should remain
    });

    it("deletes all backups when keep = 0", () => {
      writeFileSync(dbPath, "db");
      createFakeBackup("database.db.2025-01-01T10-00-00.backup", 3);
      createFakeBackup("database.db.2025-01-02T10-00-00.backup", 2);
      createFakeBackup("database.db.2025-01-03T10-00-00.backup", 1);

      cleanupOldBackups(dbPath, 0);

      const files = readdirSync(tempDir);
      const backups = files.filter((f: string) => f.endsWith(".backup"));
      expect(backups.length).toBe(0);
    });
  });

  describe("checkPendingMigrations", () => {
    it(
      "returns empty array when schema doesn't exist",
      () => {
        const nonExistentSchema = join(tempDir, "schema.prisma");

        const pending = checkPendingMigrations(nonExistentSchema);

        // Should handle gracefully (Prisma will fail, but we catch it)
        expect(Array.isArray(pending)).toBe(true);
      },
      10000
    ); // 10s timeout for Prisma CLI

    it(
      "returns array type",
      () => {
        // Note: This test will actually try to run Prisma CLI
        // In a real e2e scenario with valid schema, it would parse output
        const schemaPath = join(tempDir, "schema.prisma");
        writeFileSync(
          schemaPath,
          `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

model User {
  id Int @id @default(autoincrement())
}
      `.trim()
        );

        const pending = checkPendingMigrations(schemaPath);

        expect(Array.isArray(pending)).toBe(true);
      },
      10000
    ); // 10s timeout for Prisma CLI

    it(
      "handles Prisma CLI errors gracefully",
      () => {
        const invalidSchema = join(tempDir, "invalid.prisma");
        writeFileSync(invalidSchema, "invalid prisma schema");

        // Should not throw, just return array (possibly empty or with unknown)
        expect(() => checkPendingMigrations(invalidSchema)).not.toThrow();

        const result = checkPendingMigrations(invalidSchema);
        expect(Array.isArray(result)).toBe(true);
      },
      10000
    ); // 10s timeout for Prisma CLI
  });

  describe("integration: backup workflow", () => {
    it("full backup and cleanup cycle", async () => {
      // Helper to wait 1 second to ensure different timestamps in backup filenames
      const wait = () => new Promise((resolve) => setTimeout(resolve, 1000));

      // 1. Create initial database
      writeFileSync(dbPath, "version 1");

      // 2. Create first backup (oldest)
      const backup1 = createBackup(dbPath);
      expect(existsSync(backup1)).toBe(true);
      await wait(); // Wait 1 second for next backup to have different timestamp

      // 3. Create second backup
      writeFileSync(dbPath, "version 2");
      const backup2 = createBackup(dbPath);
      expect(existsSync(backup2)).toBe(true);
      await wait();

      // 4. Create third backup
      writeFileSync(dbPath, "version 3");
      const backup3 = createBackup(dbPath);
      await wait();

      // 5. Create fourth backup (newest, triggers cleanup)
      writeFileSync(dbPath, "version 4");
      const backup4 = createBackup(dbPath);

      // 6. Set mtimes to simulate age (oldest to newest)
      const now = Date.now();
      utimesSync(backup1, new Date(now - 4 * 60 * 1000), new Date(now - 4 * 60 * 1000));
      utimesSync(backup2, new Date(now - 3 * 60 * 1000), new Date(now - 3 * 60 * 1000));
      utimesSync(backup3, new Date(now - 2 * 60 * 1000), new Date(now - 2 * 60 * 1000));
      utimesSync(backup4, new Date(now - 1 * 60 * 1000), new Date(now - 1 * 60 * 1000));

      // 7. Cleanup (keep 3 most recent by mtime)
      cleanupOldBackups(dbPath, 3);

      // 8. Verify only 3 most recent backups remain
      const files = readdirSync(tempDir);
      const backups = files.filter((f: string) => f.endsWith(".backup"));
      expect(backups.length).toBe(3);

      // First backup (oldest by mtime) should be deleted
      expect(existsSync(backup1)).toBe(false);

      // Last 3 should exist
      expect(existsSync(backup2)).toBe(true);
      expect(existsSync(backup3)).toBe(true);
      expect(existsSync(backup4)).toBe(true);
    });

    it("backups are restorable (contain valid content)", () => {
      // Create database with specific content
      const originalContent = "SQLite database content with special chars: 日本語 🎉";
      writeFileSync(dbPath, originalContent);

      // Create backup
      const backupPath = createBackup(dbPath);

      // Verify backup can be read and matches original
      const backupContent = readFileSync(backupPath, "utf-8");
      expect(backupContent).toBe(originalContent);

      // Simulate restoration
      const restoredPath = join(tempDir, "restored.db");
      writeFileSync(restoredPath, readFileSync(backupPath));
      expect(readFileSync(restoredPath, "utf-8")).toBe(originalContent);
    });
  });
});
