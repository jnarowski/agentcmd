import {
  existsSync,
  unlinkSync,
  copyFileSync,
  readdirSync,
  writeFileSync,
} from "fs";
import { spawnSync } from "child_process";
import { randomBytes } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  getDbPath,
  getHomeDir,
  getConfigPath,
  getLogsDir,
  getGlobalWorkflowsDir,
  ensureDirectoryExists,
} from "../utils/paths";
import { getDefaultConfig, saveConfig } from "../utils/config";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

    // 6. Set up global workflows directory
    const workflowsDir = getGlobalWorkflowsDir();
    ensureDirectoryExists(workflowsDir);

    // Create package.json for workflow dependencies
    const packageJsonPath = join(homeDir, "package.json");
    const packageJson = {
      name: "agentcmd-global-workflows",
      version: "1.0.0",
      private: true,
      type: "module",
      dependencies: {
        "agentcmd-workflows": "latest",
      },
    };

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Install dependencies
    console.log("Installing workflow dependencies...");
    const installResult = spawnSync("npm", ["install", "--silent"], {
      cwd: homeDir,
      stdio: "inherit",
      env: process.env,
    });

    if (installResult.status !== 0) {
      console.warn("⚠ Warning: Failed to install workflow dependencies");
      console.warn("  Global workflows may not work until you run:");
      console.warn(`  cd ${homeDir} && npm install`);
    }

    // Copy global workflow templates
    const templatesDir = join(__dirname, "../templates/workflows");
    let templatesCopied = 0;

    if (existsSync(templatesDir)) {
      const templateFiles = readdirSync(templatesDir);
      for (const file of templateFiles) {
        if (file.endsWith(".ts")) {
          const sourcePath = join(templatesDir, file);
          const destPath = join(workflowsDir, file);
          copyFileSync(sourcePath, destPath);
          templatesCopied++;
        }
      }
    }

    // 7. Success messaging
    console.log(`✓ Created ${homeDir}/`);
    console.log(`✓ Created database at ${dbPath}`);
    console.log(`✓ Applied database migrations`);
    console.log(`✓ Created config at ${configPath}`);
    console.log(`✓ Generated JWT secret`);
    if (installResult.status === 0) {
      console.log(`✓ Installed workflow dependencies`);
    }
    if (templatesCopied > 0) {
      console.log(`✓ Installed ${templatesCopied} global workflow template(s)`);
    }
    console.log("");
    console.log("Next steps:");
    console.log(`  1. (Optional) Edit ${configPath} to customize settings`);
    console.log("  2. Run: agentcmd start");
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
