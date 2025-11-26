import { readFileSync, writeFileSync, existsSync, chmodSync } from "fs";
import { z } from "zod";
import {
  getConfigPath,
  getHomeDir,
  ensureDirectoryExists,
} from "./paths";
import {
  DEFAULT_PORT,
  DEFAULT_INNGEST_PORT,
  DEFAULT_HOST,
  DEFAULT_EXTERNAL_HOST,
  DEFAULT_LOG_LEVEL,
  DEFAULT_ALLOWED_ORIGINS,
} from "./constants";

/**
 * Config schema - all settings including ports and secrets
 */
export const configSchema = z.object({
  port: z.number().int().min(1).max(65535),
  inngestPort: z.number().int().min(1).max(65535),
  host: z.string(),
  externalHost: z.string(),
  logLevel: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]),
  anthropicApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  jwtSecret: z.string(),
  allowedOrigins: z.string(),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Returns the default configuration
 */
export function getDefaultConfig(): Config {
  return {
    port: DEFAULT_PORT,
    inngestPort: DEFAULT_INNGEST_PORT,
    host: DEFAULT_HOST,
    externalHost: DEFAULT_EXTERNAL_HOST,
    logLevel: DEFAULT_LOG_LEVEL,
    anthropicApiKey: "",
    openaiApiKey: "",
    jwtSecret: "", // Generated during install
    allowedOrigins: DEFAULT_ALLOWED_ORIGINS,
  };
}

/**
 * Loads config from ~/.agent-workflows/config.json
 * Returns default config if file doesn't exist
 */
export function loadConfig(): Config {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return getDefaultConfig();
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content);

    // Validate with Zod schema
    return configSchema.parse(parsed);
  } catch (error) {
    console.error(`Failed to load config from ${configPath}:`, error);
    console.error("Using default configuration");
    return getDefaultConfig();
  }
}

/**
 * Saves config to ~/.agent-workflows/config.json
 * Sets file permissions to user-only (600) for security
 */
export function saveConfig(config: Config): void {
  const configPath = getConfigPath();
  const homeDir = getHomeDir();

  // Ensure directory exists
  ensureDirectoryExists(homeDir);

  // Validate config before saving
  const validated = configSchema.parse(config);

  // Write config with pretty formatting
  writeFileSync(configPath, JSON.stringify(validated, null, 2) + "\n", "utf-8");

  // Set permissions to user-only (600) for security (secrets inside)
  chmodSync(configPath, 0o600);
}

/**
 * Merges CLI flags with loaded config
 * Priority: CLI flags > config file values
 */
export function mergeWithFlags(
  config: Config,
  flags: {
    port?: number;
    inngestPort?: number;
    host?: string;
    externalHost?: string;
  }
): Config {
  return {
    ...config,
    ...(flags.port !== undefined && { port: flags.port }),
    ...(flags.inngestPort !== undefined && { inngestPort: flags.inngestPort }),
    ...(flags.host !== undefined && { host: flags.host }),
    ...(flags.externalHost !== undefined && { externalHost: flags.externalHost }),
  };
}
