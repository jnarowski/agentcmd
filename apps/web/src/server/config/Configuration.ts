/**
 * Configuration Service
 *
 * Singleton service for managing application configuration with Zod validation.
 * Provides type-safe access to environment variables and configuration values.
 */

import { ConfigSchema } from './schemas';
import type { AppConfig } from './types';

/**
 * Configuration singleton class
 *
 * Validates environment variables on initialization and provides
 * type-safe access to configuration values throughout the application.
 */
class Configuration {
  private static instance: Configuration;
  private config: AppConfig;

  /**
   * Private constructor to enforce singleton pattern
   * Parses and validates environment variables using Zod
   */
  private constructor() {
    // Parse environment variables into structured config
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
    };

    // Validate and parse config with Zod
    // This will throw a ZodError if validation fails
    this.config = ConfigSchema.parse(rawConfig);
  }

  /**
   * Get the singleton instance
   * Creates instance on first call, returns existing instance on subsequent calls
   */
  static getInstance(): Configuration {
    if (!Configuration.instance) {
      Configuration.instance = new Configuration();
    }
    return Configuration.instance;
  }

  /**
   * Get a top-level configuration section
   *
   * @param key - Configuration section key (e.g., 'server', 'jwt', 'cors')
   * @returns The configuration section
   *
   * @example
   * const serverConfig = config.get('server');
   * console.log(serverConfig.port); // 3456
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * Get the entire configuration object
   * Use sparingly - prefer get() for specific sections
   */
  getAll(): AppConfig {
    return this.config;
  }

  /**
   * Reset the singleton instance (for testing purposes only)
   * @internal
   */
  static reset(): void {
    Configuration.instance = undefined as unknown as Configuration;
  }
}

/**
 * Singleton configuration instance
 * Import and use throughout the application
 *
 * @example
 * import { config } from '@/server/config/Configuration';
 *
 * const port = config.get('server').port;
 * const jwtSecret = config.get('jwt').secret;
 */
export const config = Configuration.getInstance();

/**
 * Export Configuration class for testing purposes
 * Allows tests to call Configuration.reset()
 * @internal
 */
export { Configuration };
