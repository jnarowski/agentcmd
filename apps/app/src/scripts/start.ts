/**
 * Production start script for `pnpm start`
 *
 * Uses environment variables from .env file for configuration.
 * Runs server + Inngest with persistent storage.
 */

import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { startServer } from "@/cli/utils/startServer";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse flags
const verbose = process.argv.includes("--verbose") || process.argv.includes("-v");

// Config from environment variables
const PORT = parseInt(process.env.PORT || "4100", 10);
const HOST = process.env.HOST || "127.0.0.1";
const INNGEST_PORT = parseInt(process.env.INNGEST_PORT || "8288", 10);

// Ensure production mode
process.env.NODE_ENV = "production";

// Paths relative to the compiled dist directory
const dbPath = join(process.cwd(), "prisma/dev.db");
const logPath = join(process.cwd(), "logs/app.log");
const inngestDataDir = join(process.cwd(), "inngest-data");
const schemaPath = join(process.cwd(), "prisma/schema.prisma");
const serverPath = join(__dirname, "../server/index.js");

// Secrets from environment
const jwtSecret = process.env.JWT_SECRET || "";
const inngestEventKey = process.env.INNGEST_EVENT_KEY || "";
const inngestSigningKey = process.env.INNGEST_SIGNING_KEY || "";

if (!jwtSecret) {
  console.error("ERROR: JWT_SECRET environment variable is required");
  console.error("Set it in your .env file or as an environment variable");
  process.exit(1);
}

if (!inngestEventKey || !inngestSigningKey) {
  console.error("ERROR: INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY are required");
  console.error("Run 'pnpm dev:setup' to generate them in your .env file");
  process.exit(1);
}

startServer({
  port: PORT,
  host: HOST,
  externalHost: process.env.EXTERNAL_HOST || "localhost",
  inngestPort: INNGEST_PORT,
  inngestDataDir,
  inngestEventKey,
  inngestSigningKey,
  dbPath,
  schemaPath,
  serverPath,
  logPath,
  jwtSecret,
  logLevel: process.env.LOG_LEVEL || "info",
  allowedOrigins: process.env.ALLOWED_ORIGINS || `http://localhost:${PORT}`,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  isProduction: true,
  createBackups: false, // Scripts don't need backups
  verbose,
});
