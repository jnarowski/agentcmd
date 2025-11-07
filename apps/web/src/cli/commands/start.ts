import { spawn, type ChildProcess } from "child_process";
import { spawnSync } from "child_process";
import { loadConfig, mergeWithFlags } from "../utils/config.js";
import { ensurePortAvailable } from "../utils/portCheck.js";
import { getDbPath, getConfigPath, getLogFilePath } from "../utils/paths.js";

interface StartOptions {
  port?: number;
  inngestPort?: number;
  host?: string;
}

let fastifyServer: any = null;
let inngestProcess: ChildProcess | null = null;

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
    process.env.DATABASE_URL = `file:${dbPath}`;
    process.env.JWT_SECRET = mergedConfig.jwtSecret;
    process.env.LOG_LEVEL = mergedConfig.logLevel;
    process.env.ALLOWED_ORIGINS = mergedConfig.allowedOrigins;

    if (mergedConfig.anthropicApiKey) {
      process.env.ANTHROPIC_API_KEY = mergedConfig.anthropicApiKey;
    }

    // 4. Run Prisma migrations
    console.log("Running database migrations...");
    const migrateResult = spawnSync(
      "npx",
      ["prisma", "migrate", "deploy", "--schema=./dist/prisma/schema.prisma"],
      {
        stdio: "inherit",
        env: process.env,
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

    // 5. Import and start Fastify server
    console.log("Starting Fastify server...");
    const { startServer } = await import("../../server/index.js");
    fastifyServer = await startServer({ port, host });

    // 6. Spawn Inngest dev UI
    console.log("Starting Inngest dev UI...");
    inngestProcess = spawn(
      "npx",
      [
        "inngest-cli@latest",
        "dev",
        "-u",
        `http://localhost:${port}/api/workflows/inngest`,
        "--port",
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

    // 7. Log startup URLs
    console.log("");
    console.log("✓ Server running at http://localhost:" + port);
    console.log("✓ Inngest Dev UI at http://localhost:" + inngestPort);
    console.log("✓ Database: " + dbPath);
    console.log("✓ Config: " + configPath);
    console.log("✓ Logs: " + logPath);
    console.log("");
    console.log("Press Ctrl+C to stop");

    // 8. Setup graceful shutdown
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
