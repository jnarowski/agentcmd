import { spawn, spawnSync, type ChildProcess } from "child_process";
import { existsSync, createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "path";
import type { StdioOptions } from "child_process";
import pc from "picocolors";
import { ensurePortAvailable } from "./portCheck";
import { checkPendingMigrations, createBackup, cleanupOldBackups } from "./backup";
import { PRISMA_VERSION } from "./constants";
import { setInngestEnvironment } from "@/shared/utils/inngestEnv";
import { waitForServerReady } from "./serverHealth";
import { spawnInngest } from "./spawnInngest";

// PUBLIC API

export interface StartServerConfig {
  /** Server port */
  port: number;
  /** Server host (e.g., 127.0.0.1) */
  host: string;
  /** External host for URLs (e.g., localhost) */
  externalHost: string;
  /** Inngest port */
  inngestPort: number;
  /** Inngest data directory for persistence */
  inngestDataDir: string;
  /** Inngest event key */
  inngestEventKey: string;
  /** Inngest signing key */
  inngestSigningKey: string;
  /** Path to database file */
  dbPath: string;
  /** Path to Prisma schema */
  schemaPath: string;
  /** Path to server entry point */
  serverPath: string;
  /** Path to log file */
  logPath: string;
  /** JWT secret for auth */
  jwtSecret: string;
  /** Log level */
  logLevel: string;
  /** Allowed origins for CORS */
  allowedOrigins: string;
  /** Anthropic API key (optional) */
  anthropicApiKey?: string;
  /** OpenAI API key (optional) */
  openaiApiKey?: string;
  /** Production mode flag */
  isProduction: boolean;
  /** Create database backups before migrations */
  createBackups: boolean;
  /** Verbose logging */
  verbose: boolean;
}

/**
 * Starts the server with full startup sequence:
 * 1. Check port availability
 * 2. Set environment variables
 * 3. Validate JWT_SECRET
 * 4. Backup database (if enabled and pending migrations)
 * 5. Prisma generate + migrate
 * 6. Start Fastify server
 * 7. Wait for health check
 * 8. Start Inngest
 * 9. Print startup banner
 * 10. Setup graceful shutdown
 */
export async function startServer(config: StartServerConfig): Promise<void> {
  const {
    port,
    host,
    externalHost,
    inngestPort,
    inngestDataDir,
    inngestEventKey,
    inngestSigningKey,
    dbPath,
    schemaPath,
    serverPath,
    logPath,
    jwtSecret,
    logLevel,
    allowedOrigins,
    anthropicApiKey,
    openaiApiKey,
    isProduction,
    createBackups,
    verbose,
  } = config;

  let serverProcess: ChildProcess | null = null;
  let inngestProcess: ChildProcess | null = null;

  const stdioSync: StdioOptions = verbose ? "inherit" : "pipe";
  const stdioAsync: StdioOptions = verbose ? "inherit" : ["ignore", "pipe", "pipe"];

  try {
    // 1. Check both ports are available
    if (verbose) console.log("Checking port availability...");
    await ensurePortAvailable(port, "server");
    await ensurePortAvailable(inngestPort, "Inngest");

    // 2. Set environment variables from config
    process.env.PORT = port.toString();
    process.env.HOST = host;
    process.env.EXTERNAL_HOST = externalHost;
    process.env.NODE_ENV = isProduction ? "production" : process.env.NODE_ENV || "development";
    process.env.DATABASE_URL = `file:${dbPath}`;
    process.env.JWT_SECRET = jwtSecret;
    process.env.LOG_LEVEL = logLevel;
    process.env.ALLOWED_ORIGINS = allowedOrigins;

    // Configure Inngest before any SDK imports
    setInngestEnvironment({ port: inngestPort });
    process.env.INNGEST_EVENT_KEY = inngestEventKey;
    process.env.INNGEST_SIGNING_KEY = inngestSigningKey;

    // 3. Validate JWT_SECRET
    if (!jwtSecret) {
      console.error("JWT_SECRET is required");
      throw new Error("JWT_SECRET is required");
    }

    if (anthropicApiKey) {
      process.env.ANTHROPIC_API_KEY = anthropicApiKey;
    }
    if (openaiApiKey) {
      process.env.OPENAI_API_KEY = openaiApiKey;
    }

    // 4. Backup database (if enabled and pending migrations)
    if (createBackups && existsSync(dbPath)) {
      if (verbose) console.log("Checking for pending migrations...");
      const pendingMigrations = checkPendingMigrations(schemaPath);

      if (pendingMigrations.length > 0) {
        if (verbose) console.log(`Found ${pendingMigrations.length} pending migration(s)`);
        if (verbose) console.log("Creating database backup...");

        try {
          const backupPath = createBackup(dbPath);
          if (verbose) console.log(`Backup created: ${backupPath}`);
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
      [PRISMA_VERSION, "generate", "--no-hints", `--schema=${schemaPath}`],
      {
        stdio: stdioSync,
        env: {
          ...process.env,
          PRISMA_HIDE_UPDATE_MESSAGE: "true",
          PRISMA_SKIP_DOTENV_LOAD: "1",
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
      [PRISMA_VERSION, "migrate", "deploy", `--schema=${schemaPath}`],
      {
        stdio: stdioSync,
        env: {
          ...process.env,
          PRISMA_SKIP_DOTENV_LOAD: "1",
        },
      }
    );

    if (migrateResult.error) {
      throw new Error(`Failed to run Prisma migrations: ${migrateResult.error.message}`);
    }

    if (migrateResult.status !== 0) {
      if (!verbose && migrateResult.stderr) {
        console.error(migrateResult.stderr.toString());
      }
      throw new Error(`Prisma migrations failed with exit code ${migrateResult.status}`);
    }

    // 6. Start Fastify server as child process
    if (!verbose) console.log(pc.dim("Starting server..."));
    if (verbose) console.log("Starting Fastify server...");

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
      mkdirSync(dirname(logPath), { recursive: true });
      const logStream = createWriteStream(logPath, { flags: "a" });
      serverProcess.stdout.pipe(logStream);
      serverProcess.stderr?.pipe(logStream);
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
    await waitForServerReady(`http://${externalHost}:${port}/api/health`, {
      timeout: 30000,
    });
    if (verbose) console.log("Server is ready");

    // 8. Start Inngest
    let inngestStderr = "";

    if (!verbose) console.log(pc.dim("Starting workflow engine..."));
    if (verbose) console.log("Starting Inngest Server...");

    // Ensure Inngest data directory exists
    mkdirSync(inngestDataDir, { recursive: true });

    inngestProcess = spawnInngest({
      port: inngestPort,
      sdkUrl: `http://${host}:${port}/api/workflows/inngest`,
      dataDir: inngestDataDir,
      eventKey: inngestEventKey,
      signingKey: inngestSigningKey,
      stdio: stdioAsync,
      env: process.env,
    });

    if (!verbose && inngestProcess.stdout) {
      const logStream = createWriteStream(logPath, { flags: "a" });
      inngestProcess.stdout.pipe(logStream);
      inngestProcess.stderr?.pipe(logStream);
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

    // Wait for Inngest to sync with SDK (it retries automatically, but give it time for initial sync)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 9. Print startup banner
    printStartupBanner({
      port,
      inngestPort,
      dbPath,
      logPath,
      verbose,
    });

    // 10. Setup graceful shutdown
    const cleanup = async () => {
      console.log("\nShutting down gracefully...");
      if (inngestProcess) {
        console.log("Stopping Inngest...");
        inngestProcess.kill("SIGTERM");
        inngestProcess = null;
      }
      if (serverProcess) {
        console.log("Stopping Fastify server...");
        serverProcess.kill("SIGTERM");
        serverProcess = null;
      }
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  } catch (error) {
    console.error("Failed to start:", error instanceof Error ? error.message : error);
    if (inngestProcess) inngestProcess.kill();
    if (serverProcess) serverProcess.kill();
    process.exit(1);
  }
}

// PRIVATE HELPERS

interface BannerOptions {
  port: number;
  inngestPort: number;
  dbPath: string;
  logPath: string;
  verbose: boolean;
}

const brandCyan = (text: string) => `\x1b[38;2;6;182;212m${text}\x1b[0m`;

function printStartupBanner(opts: BannerOptions): void {
  const { port, inngestPort, dbPath, logPath, verbose } = opts;

  if (verbose) {
    console.log("");
    console.log("Server running at http://localhost:" + port);
    console.log(`Inngest at http://localhost:${inngestPort}`);
    console.log("Database: " + dbPath);
    console.log("Logs: " + logPath);
    console.log("");
    console.log("Press Ctrl+C to stop");
    return;
  }

  console.log("");
  console.log(pc.bold(brandCyan("agentcmd")) + pc.dim(" ready"));
  console.log("");
  console.log(pc.green("") + " Server     " + brandCyan(`http://localhost:${port}`));
  console.log(pc.green("") + " Inngest    " + brandCyan(`http://localhost:${inngestPort}`));
  console.log(pc.green("") + " Database   " + pc.dim(dbPath));
  console.log(pc.green("") + " Logs       " + pc.dim(logPath));
  console.log("");
  console.log(pc.dim("Press Ctrl+C to stop"));
}
