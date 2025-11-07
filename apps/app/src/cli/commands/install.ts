import { existsSync, unlinkSync } from "fs";
import { spawnSync } from "child_process";
import { randomBytes } from "crypto";
import {
  getDbPath,
  getHomeDir,
  getConfigPath,
  getLogsDir,
  ensureDirectoryExists,
} from "../utils/paths.js";
import { getDefaultConfig, saveConfig } from "../utils/config.js";

interface InstallOptions {
  force?: boolean;
}

export async function installCommand(options: InstallOptions): Promise<void> {
  try {
    const homeDir = getHomeDir();
    const dbPath = getDbPath();
    const configPath = getConfigPath();
    const logsDir = getLogsDir();

    // 1. Check for existing database
    if (existsSync(dbPath)) {
      if (!options.force) {
        throw new Error(
          `Database already exists at ${dbPath}. Use --force to overwrite.`
        );
      }
      // Delete existing database if --force is specified
      unlinkSync(dbPath);
    }

    // 2. Create necessary directories
    ensureDirectoryExists(homeDir);
    ensureDirectoryExists(logsDir);

    // 3. Generate JWT secret
    const jwtSecret = randomBytes(32).toString("base64");

    // 4. Run Prisma migrations
    process.env.DATABASE_URL = `file:${dbPath}`;

    const result = spawnSync(
      "npx",
      ["prisma", "migrate", "deploy", "--schema=./dist/prisma/schema.prisma"],
      {
        stdio: "inherit",
        env: process.env,
      }
    );

    if (result.error) {
      throw new Error(`Failed to run Prisma migrations: ${result.error.message}`);
    }

    if (result.status !== 0) {
      throw new Error(`Prisma migrations failed with exit code ${result.status}`);
    }

    // 5. Create config file with generated JWT secret
    const defaultConfig = getDefaultConfig();
    const configWithSecret = {
      ...defaultConfig,
      jwtSecret,
    };
    saveConfig(configWithSecret);

    // 6. Success messaging
    console.log(`✓ Created ${homeDir}/`);
    console.log(`✓ Created database at ${dbPath}`);
    console.log(`✓ Applied database migrations`);
    console.log(`✓ Created config at ${configPath}`);
    console.log(`✓ Generated JWT secret`);
    console.log("");
    console.log("Next steps:");
    console.log(`  1. (Optional) Edit ${configPath} to customize settings`);
    console.log("  2. Run: agent-workflows-ui start");
    console.log("");
    console.log("Default configuration:");
    console.log("  Server Port:    3456");
    console.log("  Inngest Port:   8288");
    console.log(`  Database:       ${dbPath}`);
    console.log(`  Logs:           ${logsDir}/app.log`);
  } catch (error) {
    console.error("Installation failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
