/**
 * Configuration Types
 *
 * Type definitions inferred from Zod schemas
 */

import { z } from 'zod';
import { ConfigSchema } from './schemas';

/**
 * Application configuration type
 */
export type AppConfig = z.infer<typeof ConfigSchema>;

/**
 * Server configuration type
 */
export type ServerConfig = AppConfig['server'];

/**
 * CORS configuration type
 */
export type CorsConfig = AppConfig['cors'];

/**
 * JWT configuration type
 */
export type JwtConfig = AppConfig['jwt'];

/**
 * Database configuration type
 */
export type DatabaseConfig = AppConfig['database'];

/**
 * API keys configuration type
 */
export type ApiKeysConfig = AppConfig['apiKeys'];
