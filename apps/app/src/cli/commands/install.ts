import {
  existsSync,
  unlinkSync,
} from "fs";
import { spawnSync } from "child_process";
import { randomBytes } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pc from "picocolors";
import {
  getDbPath,
  getHomeDir,
  getLogsDir,
  ensureDirectoryExists,
} from "../utils/paths";
import { getDefaultConfig, saveConfig } from "../utils/config";
import { showWelcomeBanner, showBoxedOutput } from "../utils/branding";
import { promptForAnthropicKey, promptForOpenAIKey } from "../utils/prompts";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface InstallOptions {
  force?: boolean;
}

// ============================================================================
// PUBLIC API
// ============================================================================

export async function installCommand(options: InstallOptions): Promise<void> {
  try {
    // Show welcome banner
    showWelcomeBanner();

    const homeDir = getHomeDir();
    const dbPath = getDbPath();
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

    // 4. Initialize database with Prisma
    process.env.DATABASE_URL = `file:${dbPath}`;

    // Calculate absolute path to schema (relative to bundled CLI location)
    const schemaPath = join(__dirname, 'prisma/schema.prisma');

    // Generate Prisma client first
    const generateResult = spawnSync(
      "npx",
      ["prisma@7.0.1", "generate", "--no-hints", `--schema=${schemaPath}`],
      {
        stdio: "pipe",
        env: {
          ...process.env,
          PRISMA_HIDE_UPDATE_MESSAGE: "true",
        },
      }
    );

    if (generateResult.status !== 0) {
      const errorOutput = generateResult.stderr?.toString() || generateResult.stdout?.toString() || "Unknown error";
      showBoxedOutput("Generating Prisma Client - Failed", errorOutput);
      throw new Error(`Prisma client generation failed with exit code ${generateResult.status}`);
    }

    const generateOutput = (generateResult.stdout?.toString() || "") + (generateResult.stderr?.toString() || "");
    if (generateOutput.trim()) {
      showBoxedOutput("Generating Prisma Client", generateOutput);
    }

    // Apply migrations for initial setup
    const result = spawnSync(
      "npx",
      ["prisma@7.0.1", "migrate", "deploy", `--schema=${schemaPath}`],
      {
        stdio: "pipe",
        env: {
          ...process.env,
        },
      }
    );

    if (result.error) {
      throw new Error(`Failed to initialize database: ${result.error.message}`);
    }

    if (result.status !== 0) {
      const errorOutput = result.stderr?.toString() || result.stdout?.toString() || "Unknown error";
      showBoxedOutput("Applying Database Migrations - Failed", errorOutput);
      throw new Error(`Database initialization failed with exit code ${result.status}`);
    }

    const migrateOutput = (result.stdout?.toString() || "") + (result.stderr?.toString() || "");
    if (migrateOutput.trim()) {
      showBoxedOutput("Applying Database Migrations", migrateOutput);
    }

    // 5. Prompt for API keys (optional)
    const anthropicApiKey = await promptForAnthropicKey("Skipped Anthropic - add later by editing ~/.agentcmd/config.json");
    const openaiApiKey = await promptForOpenAIKey("Skipped OpenAI - add later by editing ~/.agentcmd/config.json");

    // 6. Create config file with generated JWT secret and API keys
    const defaultConfig = getDefaultConfig();
    const configWithSecret = {
      ...defaultConfig,
      // Override with env vars if present
      port: process.env.PORT ? parseInt(process.env.PORT) : defaultConfig.port,
      inngestPort: process.env.INNGEST_PORT ? parseInt(process.env.INNGEST_PORT) : defaultConfig.inngestPort,
      host: process.env.HOST || defaultConfig.host,
      logLevel: process.env.LOG_LEVEL as typeof defaultConfig.logLevel || defaultConfig.logLevel,
      anthropicApiKey: anthropicApiKey || "",
      openaiApiKey: openaiApiKey || "",
      jwtSecret,
    };
    saveConfig(configWithSecret);

    // 7. Success messaging
    const boxWidth = 61; // Content width for success box
    const padBox = (text: string) => {
      // eslint-disable-next-line no-control-regex
      const visible = text.replace(/\u001b\[[0-9;]*m/g, '');
      const spaces = boxWidth - visible.length;
      return text + ' '.repeat(Math.max(0, spaces));
    };

    console.log("");
    console.log(pc.green("┌─────────────────────────────────────────────────────────────┐"));
    console.log(pc.green("│") + padBox(" " + pc.bold(pc.green("✓ Installation Complete!"))) + pc.green("│"));
    console.log(pc.green("├─────────────────────────────────────────────────────────────┤"));
    console.log(pc.green("│") + padBox("") + pc.green("│"));
    console.log(pc.green("│") + padBox("  " + pc.green("✓") + " Created " + pc.cyan(homeDir + "/")) + pc.green("│"));
    console.log(pc.green("│") + padBox("  " + pc.green("✓") + " Database initialized") + pc.green("│"));
    console.log(pc.green("│") + padBox("  " + pc.green("✓") + " Configuration saved") + pc.green("│"));
    console.log(pc.green("│") + padBox("") + pc.green("│"));
    console.log(pc.green("├─────────────────────────────────────────────────────────────┤"));
    console.log(pc.green("│") + padBox(" " + pc.bold("Next Steps")) + pc.green("│"));
    console.log(pc.green("│") + padBox("") + pc.green("│"));
    console.log(pc.green("│") + padBox("  " + pc.dim("1.") + " " + pc.dim("(Optional) Edit") + " " + pc.cyan("~/.agentcmd/config.json")) + pc.green("│"));
    console.log(pc.green("│") + padBox("  " + pc.dim("2.") + " " + pc.bold("Run:") + " " + pc.yellow("agentcmd start")) + pc.green("│"));
    console.log(pc.green("│") + padBox("") + pc.green("│"));
    console.log(pc.green("├─────────────────────────────────────────────────────────────┤"));
    console.log(pc.green("│") + padBox(" " + pc.bold("Configuration")) + pc.green("│"));
    console.log(pc.green("│") + padBox("") + pc.green("│"));
    console.log(pc.green("│") + padBox("  " + pc.dim("Server Port:") + "  " + pc.cyan(configWithSecret.port)) + pc.green("│"));
    console.log(pc.green("│") + padBox("  " + pc.dim("Inngest Port:") + " " + pc.cyan(configWithSecret.inngestPort)) + pc.green("│"));
    console.log(pc.green("│") + padBox("  " + pc.dim("Database:") + "     " + pc.cyan(dbPath)) + pc.green("│"));
    console.log(pc.green("│") + padBox("  " + pc.dim("Logs:") + "         " + pc.cyan(logsDir + "/app.log")) + pc.green("│"));
    console.log(pc.green("│") + padBox("") + pc.green("│"));
    console.log(pc.green("└─────────────────────────────────────────────────────────────┘"));
    console.log("");
  } catch (error) {
    const boxWidth = 61;
    const padError = (text: string) => {
      // eslint-disable-next-line no-control-regex
      const visible = text.replace(/\u001b\[[0-9;]*m/g, '');
      const spaces = boxWidth - visible.length;
      return text + ' '.repeat(Math.max(0, spaces));
    };

    console.log("");
    console.log(pc.red("┌─────────────────────────────────────────────────────────────┐"));
    console.log(pc.red("│") + padError(" " + pc.bold(pc.red("✗ Installation Failed"))) + pc.red("│"));
    console.log(pc.red("├─────────────────────────────────────────────────────────────┤"));
    console.log(pc.red("│") + padError("") + pc.red("│"));
    console.log(pc.red("│") + padError("  " + (error instanceof Error ? error.message : error)) + pc.red("│"));
    console.log(pc.red("│") + padError("") + pc.red("│"));
    console.log(pc.red("└─────────────────────────────────────────────────────────────┘"));
    console.log("");
    process.exit(1);
  }
}
