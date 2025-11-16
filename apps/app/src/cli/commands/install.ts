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
import pc from "picocolors";
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
 * Display welcome banner
 */
function showWelcomeBanner(): void {
  const width = 59; // Total content width
  const emerald = "\x1b[38;2;5;150;105m"; // #059669
  const reset = "\x1b[0m";

  const pad = (text: string) => {
    // Remove ANSI codes to count actual visible characters
    const visible = text.replace(/\u001b\[[0-9;]*m/g, '');
    const spaces = width - visible.length;
    return text + ' '.repeat(Math.max(0, spaces));
  };

  const center = (text: string) => {
    const visible = text.replace(/\u001b\[[0-9;]*m/g, '');
    const spaces = width - visible.length;
    const leftPad = Math.floor(spaces / 2);
    const rightPad = spaces - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  };

  console.log("");
  console.log(pc.cyan("   ╔═══════════════════════════════════════════════════════════╗"));
  console.log(pc.cyan("   ║") + center("") + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(pc.blue("█████╗  ██████╗ ███████╗███╗   ██╗████████╗"))) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(pc.blue("██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝"))) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(pc.blue("███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   "))) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(pc.blue("██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   "))) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(pc.blue("██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   "))) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(pc.blue("╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   "))) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center("") + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(`${emerald}██████╗███╗   ███╗██████╗ ${reset}`)) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(`${emerald}██╔════╝████╗ ████║██╔══██╗${reset}`)) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(`${emerald}██║     ██╔████╔██║██║  ██║${reset}`)) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(`${emerald}██║     ██║╚██╔╝██║██║  ██║${reset}`)) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(`${emerald}╚██████╗██║ ╚═╝ ██║██████╔╝${reset}`)) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(pc.bold(`${emerald} ╚═════╝╚═╝     ╚═╝╚═════╝ ${reset}`)) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center("") + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center(`${emerald}[>]${reset} ` + pc.dim("AI Coding Agent Orchestration")) + pc.cyan("║"));
  console.log(pc.cyan("   ║") + center("") + pc.cyan("║"));
  console.log(pc.cyan("   ╚═══════════════════════════════════════════════════════════╝"));
  console.log("");

  // Animated welcome message
  const messages = [
    pc.cyan("   ⚡ Initializing installation..."),
  ];

  for (const msg of messages) {
    console.log(msg);
  }
  console.log("");
}

/**
 * Show loading animation
 */
function showProgress(message: string): void {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const interval = setInterval(() => {
    output.write(`\r   ${pc.cyan(frames[i])} ${message}...`);
    i = (i + 1) % frames.length;
  }, 80);

  return () => {
    clearInterval(interval);
    output.write("\r");
  };
}

/**
 * Display output in a styled box with title
 */
function showBoxedOutput(title: string, content: string): void {
  const emerald = "\x1b[38;2;5;150;105m"; // #059669
  const reset = "\x1b[0m";
  const dim = "\x1b[2m";

  const lines = content.trim().split('\n');
  const maxWidth = Math.max(
    title.length + 4,
    ...lines.map(line => line.replace(/\u001b\[[0-9;]*m/g, '').length)
  );
  const boxWidth = Math.min(maxWidth + 4, 75);

  console.log("");
  console.log(`   ${emerald}┌─ ${pc.bold(title)} ${"─".repeat(Math.max(0, boxWidth - title.length - 4))}┐${reset}`);

  for (const line of lines) {
    // Indent each line slightly
    console.log(`   ${emerald}│${reset} ${dim}${line}${reset}`);
  }

  console.log(`   ${emerald}└${"─".repeat(boxWidth)}┘${reset}`);
  console.log("");
}

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
  console.log(pc.bold(pc.cyan("┌─ Configure API Keys (optional)")));
  console.log(pc.cyan("│"));
  console.log(pc.cyan("│") + "  " + pc.bold("Anthropic API Key"));
  console.log(pc.cyan("│") + "  " + pc.dim("Required for workflow step.ai features using the Anthropic model"));
  console.log(pc.cyan("│") + "  " + pc.blue("https://console.anthropic.com/settings/keys"));
  console.log(pc.cyan("│"));

  const apiKey = await rl.question(pc.cyan("└─ ") + "Enter key (or press Enter to skip): ");
  rl.close();

  const trimmed = apiKey.trim();
  if (!trimmed) {
    console.log(pc.yellow("   ⚠ Skipped Anthropic") + pc.dim(" - add later by editing ~/.agentcmd/config.json"));
    return "";
  }

  // Validate format
  if (!validateAnthropicKeyFormat(trimmed)) {
    console.log(pc.yellow("   ⚠ Invalid Anthropic format") + pc.dim(" (expected sk-ant-...)"));
    return "";
  }

  // Test API key
  output.write(pc.cyan("   ⠋ Validating..."));
  const isValid = await testAnthropicKey(trimmed);
  output.write("\r");

  if (isValid) {
    console.log(pc.green("   ✓ Anthropic API key verified"));
  } else {
    console.log(pc.yellow("   ✗ Anthropic API key validation failed") + pc.dim(" (continuing anyway)"));
  }

  return trimmed;
}

/**
 * Prompt for OpenAI API key
 */
async function promptForOpenAIKey(): Promise<string> {
  const rl = readline.createInterface({ input, output });

  console.log("");
  console.log(pc.bold(pc.cyan("┌─ OpenAI API Key")));
  console.log(pc.cyan("│"));
  console.log(pc.cyan("│") + "  " + pc.dim("Required for workflow step.ai features using the OpenAI model"));
  console.log(pc.cyan("│") + "  " + pc.blue("https://platform.openai.com/api-keys"));
  console.log(pc.cyan("│"));

  const apiKey = await rl.question(pc.cyan("└─ ") + "Enter key (or press Enter to skip): ");
  rl.close();

  const trimmed = apiKey.trim();
  if (!trimmed) {
    console.log(pc.yellow("   ⚠ Skipped OpenAI") + pc.dim(" - add later by editing ~/.agentcmd/config.json"));
    return "";
  }

  // Validate format
  if (!validateOpenAIKeyFormat(trimmed)) {
    console.log(pc.yellow("   ⚠ Invalid OpenAI format") + pc.dim(" (expected sk-...)"));
    return "";
  }

  // Test API key
  output.write(pc.cyan("   ⠋ Validating..."));
  const isValid = await testOpenAIKey(trimmed);
  output.write("\r");

  if (isValid) {
    console.log(pc.green("   ✓ OpenAI API key verified"));
  } else {
    console.log(pc.yellow("   ✗ OpenAI API key validation failed") + pc.dim(" (continuing anyway)"));
  }

  return trimmed;
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
    const generateResult = spawnSync(
      "npx",
      ["prisma", "generate", "--no-hints", `--schema=${schemaPath}`],
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
      ["prisma", "migrate", "deploy", `--schema=${schemaPath}`],
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
    const boxWidth = 61; // Content width for success box
    const padBox = (text: string) => {
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
