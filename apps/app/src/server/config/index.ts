/**
 * Configuration Service
 *
 * Provides type-safe access to environment variables with Zod validation.
 * Config is validated once at module load and exported as a const object.
 */

import { ConfigSchema } from './schemas';
import type { AppConfig } from './types';

/**
 * Raw configuration object from environment variables
 */
const rawConfig = {
  server: {
    port: process.env.PORT,
    host: process.env.HOST,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
    logFile: process.env.LOG_FILE,
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  apiKeys: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
  workflow: {
    enabled: process.env.WORKFLOW_ENGINE_ENABLED,
    appId: process.env.INNGEST_APP_ID,
    eventKey: process.env.INNGEST_EVENT_KEY,
    devMode: process.env.INNGEST_DEV_MODE,
    memoizationDbPath: process.env.INNGEST_MEMOIZATION_DB_PATH,
    servePath: process.env.INNGEST_SERVE_PATH,
    inngestDevPort: process.env.INNGEST_PORT,
  },
  webhook: {
    baseUrl: process.env.WEBHOOK_BASE_URL,
  },
};

/**
 * Validated application configuration
 *
 * This will throw a ZodError if validation fails (e.g., missing JWT_SECRET).
 * Access config values via dot notation:
 *
 * @example
 * import { config } from '@/server/config';
 *
 * const port = config.server.port;
 * const jwtSecret = config.jwt.secret;
 * const workflowAppId = config.workflow.appId;
 */
export const config: AppConfig = ConfigSchema.parse(rawConfig);

/**
 * Reset the configuration (for testing purposes only)
 * Forces re-parsing of environment variables
 *
 * @internal
 */
export function reset(): void {
  // Re-parse config from current environment
  Object.assign(config, ConfigSchema.parse(rawConfig));
}
