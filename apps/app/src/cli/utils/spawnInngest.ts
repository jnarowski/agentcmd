import { spawn, execSync, type ChildProcess } from "child_process";
import type { StdioOptions } from "child_process";
import { createHash } from "node:crypto";
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
  const { port, dataDir, stdio = "pipe", env } = options;
  let { eventKey, signingKey } = options;

  // Auto-generate keys from JWT_SECRET if not provided
  // Matches server config behavior for consistency
  const jwtSecret = env?.JWT_SECRET || process.env.JWT_SECRET;

  if (!eventKey && jwtSecret) {
    eventKey = createHash("sha256")
      .update(`inngest-event-${jwtSecret}`)
      .digest("hex")
      .substring(0, 32);
  } else if (!eventKey) {
    eventKey = "local-prod-key"; // Fallback if no JWT_SECRET
  }

  if (!signingKey && jwtSecret) {
    signingKey = createHash("sha256")
      .update(`inngest-signing-${jwtSecret}`)
      .digest("hex");
  } else if (!signingKey) {
    signingKey = generateSigningKey(); // Fallback random generation
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
