/**
 * Configuration Schemas
 *
 * Zod schemas for validating environment variables and configuration
 */

import { z } from 'zod';

/**
 * Server configuration schema
 */
const ServerConfigSchema = z.object({
  port: z.coerce.number().int().positive().default(3456),
  host: z.string().default('127.0.0.1'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  logFile: z.string().default('./logs/app.log'),
});

/**
 * CORS configuration schema
 */
const CorsConfigSchema = z.object({
  allowedOrigins: z
    .string()
    .default('http://localhost:5173')
    .transform((val) => val.split(',')),
});

/**
 * JWT configuration schema
 */
const JwtConfigSchema = z.object({
  secret: z.string().min(1, 'JWT_SECRET is required'),
});

/**
 * Database configuration schema
 */
const DatabaseConfigSchema = z.object({
  url: z.string().optional(),
});

/**
 * AI/API keys configuration schema
 */
const ApiKeysConfigSchema = z.object({
  anthropicApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
});

/**
 * Workflow configuration schema
 */
const WorkflowConfigSchema = z.object({
  enabled: z.coerce.boolean().default(true),
  appId: z.string().default('sourceborn-workflows'),
  eventKey: z.string().optional(),
  devMode: z.coerce.boolean().default(true),
  memoizationDbPath: z.string().default('./prisma/workflows.db'),
  servePath: z.string().default('/api/workflows/inngest'),
  inngestDevPort: z.coerce.number().int().positive().default(8288),
});

/**
 * Complete application configuration schema
 */
export const ConfigSchema = z.object({
  server: ServerConfigSchema,
  cors: CorsConfigSchema,
  jwt: JwtConfigSchema,
  database: DatabaseConfigSchema,
  apiKeys: ApiKeysConfigSchema,
  workflow: WorkflowConfigSchema,
});
