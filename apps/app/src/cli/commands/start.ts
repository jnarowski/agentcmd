import { spawn, type ChildProcess } from "child_process";
import { spawnSync } from "child_process";
import { existsSync, createWriteStream } from "node:fs";
import { join, dirname } from "path";
import type { StdioOptions } from "child_process";
import { fileURLToPath } from "url";
import pc from "picocolors";
import { loadConfig, mergeWithFlags } from "../utils/config";
import { ensurePortAvailable } from "../utils/portCheck";
import { getDbPath, getConfigPath, getLogFilePath } from "../utils/paths";
import { checkPendingMigrations, createBackup, cleanupOldBackups } from "../utils/backup";
import { setInngestEnvironment } from "@/shared/utils/inngestEnv";
import { waitForServerReady } from "../utils/serverHealth";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface StartOptions {
  port?: number;
  inngestPort?: number;
  host?: string;
  externalHost?: string;
  verbose?: boolean;
}

let serverProcess: ChildProcess | null = null;
let inngestProcess: ChildProcess | null = null;
let serverStartTime: Date | null = null;

export async function startCommand(options: StartOptions): Promise<void> {
  try {
    // 1. Load config and merge with CLI flags
    const config = loadConfig();
    const mergedConfig = mergeWithFlags(config, {
      port: options.port,
      inngestPort: options.inngestPort,
      host: options.host,
      externalHost: options.externalHost,
    });

    const { port, inngestPort, host, externalHost } = mergedConfig;
    const dbPath = getDbPath();
    const configPath = getConfigPath();
    const logPath = getLogFilePath();

    // 2. Check both ports are available
    const verbose = options.verbose ?? false;
    const stdioSync: StdioOptions = verbose ? "inherit" : "pipe";

    if (verbose) console.log("Checking port availability...");
    await ensurePortAvailable(port, "server");
    await ensurePortAvailable(inngestPort, "Inngest");

    // 3. Set environment variables from config
    process.env.PORT = port.toString();
    process.env.HOST = host;
    process.env.EXTERNAL_HOST = externalHost;
    process.env.NODE_ENV = "production"; // Use production logger (no pino-pretty)
    process.env.DATABASE_URL = `file:${dbPath}`;
    process.env.JWT_SECRET = mergedConfig.jwtSecret;
    process.env.LOG_LEVEL = mergedConfig.logLevel;
    process.env.ALLOWED_ORIGINS = mergedConfig.allowedOrigins;

    // Configure Inngest before any SDK imports
    setInngestEnvironment({ port: inngestPort });

    // Validate JWT_SECRET
    if (!mergedConfig.jwtSecret) {
      console.error("❌ ERROR: JWT_SECRET is empty or missing!");
      console.error(`Config loaded from: ${configPath}`);
      console.error("Run 'agentcmd install' to initialize configuration");
      throw new Error("JWT_SECRET is required");
    }

    if (mergedConfig.anthropicApiKey) {
      process.env.ANTHROPIC_API_KEY = mergedConfig.anthropicApiKey;
    }

    if (mergedConfig.openaiApiKey) {
      process.env.OPENAI_API_KEY = mergedConfig.openaiApiKey;
    }

    // 4. Check for pending migrations and create backup if needed
    // Calculate absolute path to schema (relative to bundled CLI location)
    const schemaPath = join(__dirname, 'prisma/schema.prisma');
    if (existsSync(dbPath)) {
      if (verbose) console.log("Checking for pending migrations...");
      const pendingMigrations = checkPendingMigrations(schemaPath);

      if (pendingMigrations.length > 0) {
        if (verbose) console.log(`Found ${pendingMigrations.length} pending migration(s)`);
        if (verbose) console.log("Creating database backup...");

        try {
          const backupPath = createBackup(dbPath);
          if (verbose) console.log(`✓ Backup created: ${backupPath}`);

          // Clean up old backups (keep last 3)
          cleanupOldBackups(dbPath, 3);
        } catch (error) {
          console.error("Warning: Failed to create backup:", error instanceof Error ? error.message : error);
          if (verbose) console.log("Continuing with migrations anyway...");
        }
      } else {
        if (verbose) console.log("No pending migrations found");
      }
    }

    // 5. Generate Prisma client and apply migrations
    if (!verbose) console.log(pc.dim("Preparing database..."));
    if (verbose) console.log("Generating Prisma client...");
    const generateResult = spawnSync(
      "npx",
      ["prisma@7.0", "generate", "--no-hints", `--schema=${schemaPath}`],
      {
        stdio: stdioSync,
        env: {
          ...process.env,
          PRISMA_HIDE_UPDATE_MESSAGE: "true",
          PRISMA_SKIP_DOTENV_LOAD: "1", // Prisma 7: prevent auto .env loading
        },
      }
    );

    if (generateResult.status !== 0) {
      if (!verbose && generateResult.stderr) {
        console.error(generateResult.stderr.toString());
      }
      throw new Error(`Prisma client generation failed with exit code ${generateResult.status}`);
    }

    if (verbose) console.log("Applying database migrations...");
    const migrateResult = spawnSync(
      "npx",
      ["prisma@7.0", "migrate", "deploy", `--schema=${schemaPath}`],
      {
        stdio: stdioSync,
        env: {
          ...process.env,
          PRISMA_SKIP_DOTENV_LOAD: "1", // Prisma 7: prevent auto .env loading
        },
      }
    );

    if (migrateResult.error) {
      throw new Error(
        `Failed to run Prisma migrations: ${migrateResult.error.message}`
      );
    }

    if (migrateResult.status !== 0) {
      if (!verbose && migrateResult.stderr) {
        console.error(migrateResult.stderr.toString());
      }
      throw new Error(
        `Prisma migrations failed with exit code ${migrateResult.status}`
      );
    }

    // 6. Start Fastify server as child process
    if (!verbose) console.log(pc.dim("Starting server..."));
    if (verbose) console.log("Starting Fastify server...");
    const serverPath = join(__dirname, 'server/index.js');
    const stdioAsync: StdioOptions = verbose ? "inherit" : ["ignore", "pipe", "pipe"];

    let serverStderr = "";
    serverProcess = spawn("node", [serverPath], {
      stdio: stdioAsync,
      env: {
        ...process.env,
        PORT: port.toString(),
        HOST: host,
      },
    });

    // Pipe output to log file when not verbose
    if (!verbose && serverProcess.stdout) {
      const logStream = createWriteStream(logPath, { flags: "a" });
      serverProcess.stdout.pipe(logStream);
      serverProcess.stderr?.pipe(logStream);
      // Also capture stderr for error display
      serverProcess.stderr?.on("data", (chunk) => {
        serverStderr += chunk.toString();
      });
    }

    serverProcess.on("error", (error) => {
      console.error(pc.red("Server process error:"), error);
      process.exit(1);
    });

    serverProcess.on("exit", (code) => {
      if (code !== null && code !== 0) {
        console.error(pc.red(`Server exited with code ${code}`));
        if (!verbose && serverStderr) {
          console.error(pc.dim("Server output:"));
          console.error(serverStderr);
        }
        if (inngestProcess) inngestProcess.kill();
        process.exit(code);
      }
    });

    // 7. Wait for server to be ready
    if (verbose) console.log("Waiting for server to be ready...");
    await waitForServerReady(`http://localhost:${port}/api/health`, {
      timeout: 30000,
    });
    if (verbose) console.log("✓ Server is ready");
    serverStartTime = new Date();

    // 8. Start Inngest dev UI
    if (!verbose) console.log(pc.dim("Starting workflow engine..."));
    if (verbose) console.log("Starting Inngest dev UI...");
    const inngestUrl = `http://localhost:${port}/api/workflows/inngest`;

    let inngestStderr = "";
    inngestProcess = spawn(
      "npx",
      [
        "inngest-cli@latest",
        "dev",
        "-u",
        inngestUrl,
        "-p",
        inngestPort.toString(),
      ],
      {
        stdio: stdioAsync,
        env: process.env,
      }
    );

    // Pipe output to log file when not verbose
    if (!verbose && inngestProcess.stdout) {
      const logStream = createWriteStream(logPath, { flags: "a" });
      inngestProcess.stdout.pipe(logStream);
      inngestProcess.stderr?.pipe(logStream);
      // Also capture stderr for error display
      inngestProcess.stderr?.on("data", (chunk) => {
        inngestStderr += chunk.toString();
      });
    }

    inngestProcess.on("error", (error) => {
      console.error(pc.red("Inngest process error:"), error);
    });

    inngestProcess.on("exit", (code) => {
      if (code !== null && code !== 0) {
        console.error(pc.red(`Inngest exited with code ${code}`));
        if (!verbose && inngestStderr) {
          console.error(pc.dim("Inngest output:"));
          console.error(inngestStderr);
        }
        if (serverProcess) serverProcess.kill();
        process.exit(code);
      }
    });

    // 9. Print startup banner
    printStartupBanner({ port, inngestPort, dbPath, configPath, logPath, verbose });

    // 9. Setup graceful shutdown
    setupGracefulShutdown();
  } catch (error) {
    console.error(
      "Failed to start:",
      error instanceof Error ? error.message : error
    );
    await cleanup();
    process.exit(1);
  }
}

function setupGracefulShutdown(): void {
  const shutdownHandler = async () => {
    console.log("\nShutting down gracefully...");
    await cleanup();
    process.exit(0);
  };

  process.on("SIGINT", shutdownHandler);
  process.on("SIGTERM", shutdownHandler);
}

async function cleanup(): Promise<void> {
  // Kill Inngest child process
  if (inngestProcess) {
    console.log("Stopping Inngest dev UI...");
    inngestProcess.kill("SIGTERM");
    inngestProcess = null;
  }

  // Kill server child process
  if (serverProcess) {
    console.log("Stopping Fastify server...");
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
}

/**
 * Get current server health status
 * Used by /api/health endpoint
 */
export function getServerHealth() {
  return {
    serverProcess,
    inngestProcess,
    serverStartTime,
  };
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

interface BannerOptions {
  port: number;
  inngestPort: number;
  dbPath: string;
  configPath: string;
  logPath: string;
  verbose: boolean;
}

// Brand color #06B6D4 as ANSI true color
const brandCyan = (text: string) => `\x1b[38;2;6;182;212m${text}\x1b[0m`;

function printStartupBanner(opts: BannerOptions): void {
  const { port, inngestPort, dbPath, logPath, verbose } = opts;

  // For verbose mode, use simple output
  if (verbose) {
    console.log("");
    console.log("✓ Server running at http://localhost:" + port);
    console.log("✓ Inngest Dev UI at http://localhost:" + inngestPort);
    console.log("✓ Database: " + dbPath);
    console.log("✓ Logs: " + logPath);
    console.log("");
    console.log("Press Ctrl+C to stop");
    return;
  }

  // Clean startup banner with brand colors
  console.log("");
  console.log(pc.bold(brandCyan("agentcmd")) + pc.dim(" ready"));
  console.log("");
  console.log(pc.green("✓") + " Server     " + brandCyan(`http://localhost:${port}`));
  console.log(pc.green("✓") + " Inngest    " + brandCyan(`http://localhost:${inngestPort}`));
  console.log(pc.green("✓") + " Database   " + pc.dim(dbPath));
  console.log(pc.green("✓") + " Logs       " + pc.dim(logPath));
  console.log("");
  console.log(pc.dim("Press Ctrl+C to stop"));
}
