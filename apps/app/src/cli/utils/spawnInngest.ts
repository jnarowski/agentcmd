import { spawn, type ChildProcess } from "child_process";
import type { StdioOptions } from "child_process";
import { INNGEST_CLI_VERSION } from "./constants";

// PUBLIC API

export interface SpawnInngestOptions {
  /** Inngest port */
  port: number;
  /** App server port for SDK URL (default: 4100) */
  sdkPort?: number;
  /** Inngest data directory for persistence */
  dataDir?: string;
  /** Event key */
  eventKey: string;
  /** Signing key */
  signingKey: string;
  /** stdio configuration */
  stdio?: StdioOptions;
  /** Additional environment variables */
  env?: NodeJS.ProcessEnv;
}

/**
 * Spawns Inngest server with `inngest start` (persistent mode)
 * Always uses the same mode for consistency across dev/start/cli
 */
export function spawnInngest(options: SpawnInngestOptions): ChildProcess {
  const { port, dataDir, eventKey, signingKey, stdio = "pipe", env } = options;

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
