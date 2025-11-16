import {
  existsSync,
  unlinkSync,
} from "fs";
import { spawnSync } from "child_process";
import { randomBytes } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  getDbPath,
  getHomeDir,
  getConfigPath,
  getLogsDir,
  ensureDirectoryExists,
} from "../utils/paths";
import { getDefaultConfig, saveConfig } from "../utils/config";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface InstallOptions {
  force?: boolean;
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Validate Anthropic API key format
 */
function validateAnthropicKeyFormat(key: string): boolean {
  return key.startsWith("sk-ant-") && key.length > 50 && key.length < 250;
}

/**
 * Validate OpenAI API key format
 */
function validateOpenAIKeyFormat(key: string): boolean {
  return key.startsWith("sk-") && key.length > 20 && key.length < 100;
}

/**
 * Test Anthropic API key with a simple API call
 */
async function testAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 10,
        messages: [{ role: "user", content: "test" }],
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Test OpenAI API key with a simple API call
 */
async function testOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Prompt for Anthropic API key
 */
async function promptForAnthropicKey(): Promise<string> {
  const rl = readline.createInterface({ input, output });

  console.log("");
  console.log("Configure API Keys (optional)");
  console.log("");
  console.log("Anthropic API Key:");
  console.log("Required for workflow step.ai features using the Anthropic model");
  console.log("Get yours at: https://console.anthropic.com/settings/keys");
  console.log("");

  const apiKey = await rl.question("Enter key (or press Enter to skip): ");
  rl.close();

  const trimmed = apiKey.trim();
  if (!trimmed) {
    return "";
  }

  // Validate format
  if (!validateAnthropicKeyFormat(trimmed)) {
    console.log("⚠ Invalid format (expected sk-ant-...)");
    return "";
  }

  // Test API key
  output.write("⠋ Validating...");
  const isValid = await testAnthropicKey(trimmed);
  output.write("\r");

  if (isValid) {
    console.log("✓ Anthropic API key verified");
  } else {
    console.log("✗ Anthropic API key validation failed (continuing anyway)");
  }

  return trimmed;
}

/**
 * Prompt for OpenAI API key
 */
async function promptForOpenAIKey(): Promise<string> {
  const rl = readline.createInterface({ input, output });

  console.log("");
  console.log("OpenAI API Key:");
  console.log("Required for workflow step.ai features using the OpenAI model");
  console.log("Get yours at: https://platform.openai.com/api-keys");
  console.log("");

  const apiKey = await rl.question("Enter key (or press Enter to skip): ");
  rl.close();

  const trimmed = apiKey.trim();
  if (!trimmed) {
    console.log("⚠ Skipped OpenAI configuration");
    return "";
  }

  // Validate format
  if (!validateOpenAIKeyFormat(trimmed)) {
    console.log("⚠ Invalid format (expected sk-...)");
    return "";
  }

  // Test API key
  output.write("⠋ Validating...");
  const isValid = await testOpenAIKey(trimmed);
  output.write("\r");

  if (isValid) {
    console.log("✓ OpenAI API key verified");
  } else {
    console.log("✗ OpenAI API key validation failed (continuing anyway)");
  }

  return trimmed;
}

// ============================================================================
// PUBLIC API
// ============================================================================

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

    // 4. Initialize database with Prisma
    process.env.DATABASE_URL = `file:${dbPath}`;

    // Calculate absolute path to schema (relative to bundled CLI location)
    const schemaPath = join(__dirname, 'prisma/schema.prisma');

    // Generate Prisma client first
    console.log("Generating Prisma client...");
    const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
    const generateResult = spawnSync(
      "npx",
      ["prisma", "generate", "--no-hints", `--schema=${schemaPath}`],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          PRISMA_HIDE_UPDATE_MESSAGE: "true",
          DOTENV_CONFIG_PATH: nullDevice, // Prevent .env loading
        },
      }
    );

    if (generateResult.status !== 0) {
      throw new Error(`Prisma client generation failed with exit code ${generateResult.status}`);
    }

    // Apply migrations for initial setup
    console.log("Applying database migrations...");
    const result = spawnSync(
      "npx",
      ["prisma", "migrate", "deploy", `--schema=${schemaPath}`],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          DOTENV_CONFIG_PATH: nullDevice, // Prevent .env loading
        },
      }
    );

    if (result.error) {
      throw new Error(`Failed to initialize database: ${result.error.message}`);
    }

    if (result.status !== 0) {
      throw new Error(`Database initialization failed with exit code ${result.status}`);
    }

    // 5. Prompt for API keys (optional)
    const anthropicApiKey = await promptForAnthropicKey();
    const openaiApiKey = await promptForOpenAIKey();

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
    console.log("");
    console.log(`✓ Created ${homeDir}/`);
    console.log(`✓ Initialized database at ${dbPath}`);
    console.log(`✓ Created config at ${configPath}`);
    console.log("");
    console.log("Next steps:");
    console.log(`  1. (Optional) Edit ${configPath} to customize settings`);
    console.log("  2. Run: agentcmd start");
    console.log("");
    console.log("Configuration:");
    console.log(`  Server Port:    ${configWithSecret.port}`);
    console.log(`  Inngest Port:   ${configWithSecret.inngestPort}`);
    console.log(`  Database:       ${dbPath}`);
    console.log(`  Logs:           ${logsDir}/app.log`);
  } catch (error) {
    console.error("Installation failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
