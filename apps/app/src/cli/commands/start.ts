import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadConfig, mergeWithFlags } from "../utils/config";
import { getDbPath, getConfigPath, getLogFilePath, getInngestDataDir } from "../utils/paths";
import { startServer } from "../utils/startServer";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// PUBLIC API

interface StartOptions {
  port?: number;
  inngestPort?: number;
  host?: string;
  externalHost?: string;
  verbose?: boolean;
}

export async function startCommand(options: StartOptions): Promise<void> {
  // 1. Load config and merge with CLI flags
  const config = loadConfig();
  const mergedConfig = mergeWithFlags(config, {
    port: options.port,
    inngestPort: options.inngestPort,
    host: options.host,
    externalHost: options.externalHost,
  });

  // 2. Resolve paths
  const dbPath = getDbPath();
  const configPath = getConfigPath();
  const logPath = getLogFilePath();
  const inngestDataDir = getInngestDataDir();
  const schemaPath = join(__dirname, "prisma/schema.prisma");
  const serverPath = join(__dirname, "server/index.js");

  // 3. CLI always runs in production mode (serves static files, persistent Inngest)
  const isProduction = true;
  const verbose = options.verbose ?? false;

  // Validate required secrets with helpful error
  if (!mergedConfig.jwtSecret) {
    console.error("ERROR: JWT_SECRET is empty or missing!");
    console.error(`Config loaded from: ${configPath}`);
    console.error("Run 'agentcmd install' to initialize configuration");
    process.exit(1);
  }

  if (!mergedConfig.inngestEventKey || !mergedConfig.inngestSigningKey) {
    console.error("ERROR: Inngest keys are missing!");
    console.error(`Config loaded from: ${configPath}`);
    console.error("Run 'agentcmd install --force' to regenerate configuration");
    process.exit(1);
  }

  // 4. Start server using shared utility
  await startServer({
    port: mergedConfig.port,
    host: mergedConfig.host,
    externalHost: mergedConfig.externalHost,
    inngestPort: mergedConfig.inngestPort,
    inngestDataDir,
    inngestEventKey: mergedConfig.inngestEventKey,
    inngestSigningKey: mergedConfig.inngestSigningKey,
    dbPath,
    schemaPath,
    serverPath,
    logPath,
    jwtSecret: mergedConfig.jwtSecret,
    logLevel: mergedConfig.logLevel,
    allowedOrigins: mergedConfig.allowedOrigins,
    anthropicApiKey: mergedConfig.anthropicApiKey,
    openaiApiKey: mergedConfig.openaiApiKey,
    isProduction,
    createBackups: true, // CLI always creates backups
    verbose,
  });
}
