import { spawn, type ChildProcess } from "child_process";
import type { StdioOptions } from "child_process";
import { INNGEST_CLI_VERSION } from "./constants";

// PUBLIC API

export interface SpawnInngestOptions {
  /** Inngest port */
  port: number;
  /** Full SDK URL for auto-registration (e.g., "http://127.0.0.1:4100/api/workflows/inngest") */
  sdkUrl: string;
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
  const {
    port,
    sdkUrl,
    dataDir,
    eventKey,
    signingKey,
    stdio = "pipe",
    env,
  } = options;

  const args = [
    INNGEST_CLI_VERSION,
    "start",
    "--event-key",
    eventKey,
    "--signing-key",
    signingKey,
    "--port",
    port.toString(),
    "--sdk-url",
    sdkUrl,
  ];

  if (dataDir) {
    args.push("--sqlite-dir", dataDir);
  }

  // For debugging:
  //
  // console.log(`\nManual Inngest command:\nnpx ${args.join(" ")}\n`);
  //
  return spawn("npx", args, {
    stdio,
    env: env ?? process.env,
  });
}
