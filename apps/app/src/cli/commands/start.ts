import { spawn, type ChildProcess } from "child_process";
import { spawnSync } from "child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { FastifyInstance } from "fastify";
import { loadConfig, mergeWithFlags } from "../utils/config";
import { ensurePortAvailable } from "../utils/portCheck";
import { getDbPath, getConfigPath, getLogFilePath } from "../utils/paths";
import { checkPendingMigrations, createBackup, cleanupOldBackups } from "../utils/backup";
import { setInngestEnvironment } from "@/shared/utils/inngestEnv";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface StartOptions {
  port?: number;
  inngestPort?: number;
  host?: string;
}

let fastifyServer: FastifyInstance | null = null;
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
    });

    const { port, inngestPort, host } = mergedConfig;
    const dbPath = getDbPath();
    const configPath = getConfigPath();
    const logPath = getLogFilePath();

    // 2. Check both ports are available
    console.log("Checking port availability...");
    await ensurePortAvailable(port, "server");
    await ensurePortAvailable(inngestPort, "Inngest");

    // 3. Set environment variables from config
    process.env.PORT = port.toString();
    process.env.HOST = host;
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

    // 4. Check for pending migrations and create backup if needed
    // Calculate absolute path to schema (relative to bundled CLI location)
    const schemaPath = join(__dirname, 'prisma/schema.prisma');
    if (existsSync(dbPath)) {
      console.log("Checking for pending migrations...");
      const pendingMigrations = checkPendingMigrations(schemaPath);

      if (pendingMigrations.length > 0) {
        console.log(`Found ${pendingMigrations.length} pending migration(s)`);
        console.log("Creating database backup...");

        try {
          const backupPath = createBackup(dbPath);
          console.log(`✓ Backup created: ${backupPath}`);

          // Clean up old backups (keep last 3)
          cleanupOldBackups(dbPath, 3);
        } catch (error) {
          console.error("Warning: Failed to create backup:", error instanceof Error ? error.message : error);
          console.log("Continuing with migrations anyway...");
        }
      } else {
        console.log("No pending migrations found");
      }
    }

    // 5. Generate Prisma client and apply migrations
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

    console.log("Applying database migrations...");
    const migrateResult = spawnSync(
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

    if (migrateResult.error) {
      throw new Error(
        `Failed to run Prisma migrations: ${migrateResult.error.message}`
      );
    }

    if (migrateResult.status !== 0) {
      throw new Error(
        `Prisma migrations failed with exit code ${migrateResult.status}`
      );
    }

    // 6. Import and start Fastify server
    console.log("Starting Fastify server...");
    const serverPath = join(__dirname, 'server/index.js');
    const { startServer } = await import(serverPath);
    fastifyServer = await startServer({ port, host });
    serverStartTime = new Date();

    // 7. Spawn Inngest dev UI (server already ready - awaited above)
    console.log("Starting Inngest dev UI...");
    inngestProcess = spawn(
      "npx",
      [
        "inngest-cli@latest",
        "dev",
        "-u",
        `http://localhost:${port}/api/workflows/inngest`,
        "-p",
        inngestPort.toString(),
      ],
      {
        stdio: "inherit",
        env: process.env,
      }
    );

    inngestProcess.on("error", (error) => {
      console.error("Inngest process error:", error);
    });

    inngestProcess.on("exit", (code) => {
      if (code !== null && code !== 0) {
        console.error(`Inngest process exited with code ${code}`);
      }
    });

    // 8. Log startup URLs
    console.log("");
    console.log("✓ Server running at http://localhost:" + port);
    console.log("✓ Inngest Dev UI at http://localhost:" + inngestPort);
    console.log("✓ Database: " + dbPath);
    console.log("✓ Config: " + configPath);
    console.log("✓ Logs: " + logPath);
    console.log("");
    console.log("Press Ctrl+C to stop");

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

  // Close Fastify server
  if (fastifyServer) {
    console.log("Stopping Fastify server...");
    try {
      await fastifyServer.close();
    } catch (error) {
      console.error("Error closing server:", error);
    }
    fastifyServer = null;
  }
}

/**
 * Get current server health status
 * Used by /api/health endpoint
 */
export function getServerHealth() {
  return {
    inngestProcess,
    serverStartTime,
  };
}
