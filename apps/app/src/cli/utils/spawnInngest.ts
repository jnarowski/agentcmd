import { spawn, execSync, type ChildProcess } from "child_process";
import type { StdioOptions } from "child_process";
import { INNGEST_CLI_VERSION } from "./constants";

// PUBLIC API

export interface SpawnInngestOptions {
  /** Inngest port */
  port: number;
  /** Inngest data directory (required for production mode) */
  dataDir?: string;
  /** Event key for production mode */
  eventKey?: string;
  /** Signing key for production mode (generated if not provided) */
  signingKey?: string;
  /** Server URL for dev mode (e.g., http://localhost:4100/api/workflows/inngest) */
  serverUrl?: string;
  /** stdio configuration */
  stdio?: StdioOptions;
  /** Additional environment variables */
  env?: NodeJS.ProcessEnv;
}

/**
 * Spawns Inngest process in dev or production mode based on NODE_ENV.
 * - NODE_ENV=production → `inngest start` with persistent storage
 * - Otherwise → `inngest dev` for development
 */
export function spawnInngest(options: SpawnInngestOptions): ChildProcess {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return spawnInngestProduction(options);
  }
  return spawnInngestDev(options);
}

// PRIVATE HELPERS

function spawnInngestProduction(options: SpawnInngestOptions): ChildProcess {
  const { port, dataDir, eventKey = "local-prod-key", stdio = "pipe", env } = options;
  let { signingKey } = options;

  if (!signingKey) {
    signingKey = generateSigningKey();
  }

  const args = [
    INNGEST_CLI_VERSION,
    "start",
    "--event-key",
    eventKey,
    "--signing-key",
    signingKey,
    "--port",
    port.toString(),
  ];

  if (dataDir) {
    args.push("--sqlite-dir", dataDir);
  }

  return spawn("npx", args, {
    stdio,
    env: env ?? process.env,
  });
}

function spawnInngestDev(options: SpawnInngestOptions): ChildProcess {
  const { port, serverUrl, stdio = "pipe", env } = options;

  const args = [INNGEST_CLI_VERSION, "dev", "-p", port.toString()];

  if (serverUrl) {
    args.push("-u", serverUrl);
  }

  return spawn("npx", args, {
    stdio,
    env: env ?? process.env,
  });
}

function generateSigningKey(): string {
  try {
    return execSync("openssl rand -hex 32", { encoding: "utf8" }).trim();
  } catch {
    console.error("Warning: Failed to generate signing key, using fallback");
    return "a".repeat(64); // Fallback: valid 64-char hex
  }
}
