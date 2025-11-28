/**
 * Standalone Inngest script for `pnpm dev` (concurrent mode)
 *
 * Starts Inngest dev server independently so it can be run alongside
 * the Fastify server via concurrently.
 */

import { spawnInngest } from "@/cli/utils/spawnInngest";

// Config from environment variables
const PORT = process.env.PORT || "4100";
const HOST = process.env.HOST || "127.0.0.1";
const INNGEST_PORT = parseInt(process.env.INNGEST_PORT || "8288", 10);
const isProduction = process.env.NODE_ENV === "production";

// Configure Inngest environment
process.env.INNGEST_PORT = INNGEST_PORT.toString();
process.env.INNGEST_BASE_URL = `http://${HOST}:${INNGEST_PORT}`;

if (!isProduction && !process.env.INNGEST_DEV) {
  process.env.INNGEST_DEV = "1";
}

const serverUrl = `http://${HOST}:${PORT}/api/workflows/inngest`;

if (isProduction) {
  console.log("Starting Inngest Server (persistent mode)");
} else {
  console.log(`Starting Inngest Dev Server with URL: ${serverUrl}`);
}
console.log(`Inngest ${isProduction ? "UI" : "Dev UI"} will run on port: ${INNGEST_PORT}`);

// Start Inngest with inherited stdio for direct output
const child = spawnInngest({
  port: INNGEST_PORT,
  serverUrl,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
