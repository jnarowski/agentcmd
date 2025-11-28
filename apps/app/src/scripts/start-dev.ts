/**
 * Development start script for `pnpm dev`
 *
 * Consolidates all dev startup:
 * 1. Prisma migrate deploy
 * 2. Inngest server (persistent mode)
 * 3. Fastify server (tsx watch)
 * 4. Vite client (with HMR)
 * 5. Graceful shutdown on SIGINT/SIGTERM
 */

import { spawn, spawnSync, type ChildProcess } from "child_process";
import { mkdirSync } from "fs";
import { join } from "path";
import { spawnInngest } from "@/cli/utils/spawnInngest";
import { INNGEST_DEFAULTS } from "@/shared/utils/inngestEnv";

// Track child processes for cleanup
const children: ChildProcess[] = [];
let shuttingDown = false;

// Config from environment variables
const HOST = process.env.HOST || INNGEST_DEFAULTS.HOST;
const SERVER_PORT = parseInt(process.env.PORT || "4100", 10);
const INNGEST_PORT = parseInt(process.env.INNGEST_PORT || String(INNGEST_DEFAULTS.PORT), 10);
const INNGEST_EVENT_KEY = process.env.INNGEST_EVENT_KEY || "";
const INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY || "";

// Color prefixes for console output
const COLORS = {
  migrate: "\x1b[90m", // gray
  inngest: "\x1b[35m", // magenta
  server: "\x1b[36m", // cyan
  client: "\x1b[33m", // yellow
  reset: "\x1b[0m",
};

function log(prefix: string, color: string, message: string) {
  const lines = message.split("\n").filter(Boolean);
  for (const line of lines) {
    console.log(`${color}[${prefix}]${COLORS.reset} ${line}`);
  }
}

function gracefulShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n${COLORS.reset}Received ${signal}, shutting down...`);

  // Kill all children in reverse order (client, server, inngest)
  for (const child of children.reverse()) {
    if (child.pid && !child.killed) {
      try {
        process.kill(child.pid, "SIGTERM");
      } catch {
        // Process may have already exited
      }
    }
  }

  // Force exit after 3s timeout
  setTimeout(() => {
    console.log("Force exiting...");
    process.exit(0);
  }, 3000);
}

// Setup signal handlers
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

async function main() {
  // Validate required keys
  if (!INNGEST_EVENT_KEY || !INNGEST_SIGNING_KEY) {
    console.error("ERROR: INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY are required");
    console.error("Run 'pnpm dev:setup' to generate them in your .env file");
    process.exit(1);
  }

  // Step 1: Run Prisma migrate deploy
  console.log(`${COLORS.migrate}[migrate]${COLORS.reset} Running prisma migrate deploy...`);
  const migrateResult = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: process.env,
  });

  if (migrateResult.status !== 0) {
    console.error("Migration failed");
    process.exit(1);
  }

  // Ensure inngest data directory exists
  const dataDir = join(process.cwd(), "inngest-data");
  mkdirSync(dataDir, { recursive: true });

  // Step 2: Start Inngest server
  console.log(`${COLORS.inngest}[inngest]${COLORS.reset} Starting Inngest on port ${INNGEST_PORT}...`);
  const inngestChild = spawnInngest({
    port: INNGEST_PORT,
    sdkUrl: `http://${HOST}:${SERVER_PORT}/api/workflows/inngest`,
    dataDir,
    eventKey: INNGEST_EVENT_KEY,
    signingKey: INNGEST_SIGNING_KEY,
    stdio: "pipe",
    env: process.env,
  });
  children.push(inngestChild);

  inngestChild.stdout?.on("data", (data) => {
    log("inngest", COLORS.inngest, data.toString());
  });
  inngestChild.stderr?.on("data", (data) => {
    log("inngest", COLORS.inngest, data.toString());
  });
  inngestChild.on("exit", (code) => {
    if (!shuttingDown) {
      console.error(`Inngest exited with code ${code}`);
      gracefulShutdown("inngest-exit");
    }
  });

  // Wait a moment for Inngest to start
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Step 3: Start Fastify server with tsx watch
  console.log(`${COLORS.server}[server]${COLORS.reset} Starting server...`);
  const serverChild = spawn("npx", ["tsx", "watch", "--env-file=.env", "src/server/index.ts"], {
    stdio: "pipe",
    env: {
      ...process.env,
      INNGEST_PORT: INNGEST_PORT.toString(),
      INNGEST_BASE_URL: `http://${HOST}:${INNGEST_PORT}`,
    },
  });
  children.push(serverChild);

  serverChild.stdout?.on("data", (data) => {
    log("server", COLORS.server, data.toString());
  });
  serverChild.stderr?.on("data", (data) => {
    log("server", COLORS.server, data.toString());
  });
  serverChild.on("exit", (code) => {
    if (!shuttingDown) {
      console.error(`Server exited with code ${code}`);
      gracefulShutdown("server-exit");
    }
  });

  // Step 4: Start Vite client
  console.log(`${COLORS.client}[client]${COLORS.reset} Starting client...`);
  const clientChild = spawn("npx", ["vite", "--host"], {
    stdio: "pipe",
    env: process.env,
  });
  children.push(clientChild);

  clientChild.stdout?.on("data", (data) => {
    log("client", COLORS.client, data.toString());
  });
  clientChild.stderr?.on("data", (data) => {
    log("client", COLORS.client, data.toString());
  });
  clientChild.on("exit", (code) => {
    if (!shuttingDown) {
      console.error(`Client exited with code ${code}`);
      gracefulShutdown("client-exit");
    }
  });

  console.log("\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Development servers starting...");
  console.log("");
  console.log(`  ${COLORS.client}Client:${COLORS.reset}  http://localhost:4101`);
  console.log(`  ${COLORS.server}Server:${COLORS.reset}  http://localhost:${SERVER_PORT}`);
  console.log(`  ${COLORS.inngest}Inngest:${COLORS.reset} http://localhost:${INNGEST_PORT}`);
  console.log("");
  console.log("  Press Ctrl+C to stop all servers");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n");
}

main().catch((error) => {
  console.error("Startup error:", error);
  gracefulShutdown("error");
});
