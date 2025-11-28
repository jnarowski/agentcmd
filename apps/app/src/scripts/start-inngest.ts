/**
 * Standalone Inngest script for `pnpm dev` (concurrent mode)
 *
 * Starts Inngest server independently so it can be run alongside
 * the Fastify server via concurrently.
 */

import { spawnInngest } from "@/cli/utils/spawnInngest";
import { join } from "path";
import { mkdirSync } from "fs";

// Config from environment variables
const HOST = process.env.HOST || "127.0.0.1";
const INNGEST_PORT = parseInt(process.env.INNGEST_PORT || "8288", 10);
const INNGEST_EVENT_KEY = process.env.INNGEST_EVENT_KEY || "";
const INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY || "";

// Validate required keys
if (!INNGEST_EVENT_KEY || !INNGEST_SIGNING_KEY) {
  console.error("ERROR: INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY are required");
  console.error("Run 'pnpm dev:setup' to generate them in your .env file");
  process.exit(1);
}

// Configure Inngest environment
process.env.INNGEST_PORT = INNGEST_PORT.toString();
process.env.INNGEST_BASE_URL = `http://${HOST}:${INNGEST_PORT}`;

// Ensure data directory exists
const dataDir = join(process.cwd(), "inngest-data");
mkdirSync(dataDir, { recursive: true });

console.log("Starting Inngest Server...");
console.log(`Inngest UI will run on port: ${INNGEST_PORT}`);

// Start Inngest with inherited stdio for direct output
const child = spawnInngest({
  port: INNGEST_PORT,
  dataDir,
  eventKey: INNGEST_EVENT_KEY,
  signingKey: INNGEST_SIGNING_KEY,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
