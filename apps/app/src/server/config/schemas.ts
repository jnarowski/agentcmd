/**
 * Configuration Schemas
 *
 * Zod schemas for validating environment variables and configuration
 */

import { z } from "zod";
import { createHash } from "node:crypto";

/**
 * Server configuration schema
 */
const ServerConfigSchema = z.object({
  port: z.coerce.number().int().positive().default(4100),
  vitePort: z.coerce.number().int().positive().default(4101),
  host: z.string().default("127.0.0.1"),
  externalHost: z.string().default("localhost"),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  logLevel: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  logFile: z.string().default("./logs/app.log"),
});

/**
 * CORS configuration schema
 */
const CorsConfigSchema = z.object({
  allowedOrigins: z
    .string()
    .default("http://localhost:4101")
    .transform((val) => val.split(",")),
});

/**
 * JWT configuration schema
 */
const JwtConfigSchema = z.object({
  secret: z.string().min(1, "JWT_SECRET is required"),
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
  appId: z.string().default("agentcmd"),
  eventKey: z.string().optional(),
  signingKey: z
    .string()
    .regex(/^[0-9a-fA-F]*$/, "Signing key must be valid hexadecimal")
    .refine((s) => s.length % 2 === 0, "Signing key must have even character count")
    .optional(),
  devMode: z.coerce.boolean().default(true),
  memoizationDbPath: z.string().default("./prisma/workflows.db"),
  servePath: z.string().default("/api/workflows/inngest"),
  inngestDevPort: z.coerce.number().int().positive().default(8288),
});

/**
 * Webhook configuration schema
 */
const WebhookConfigSchema = z.object({
  baseUrl: z.string().url().optional(),
});

/**
 * Complete application configuration schema
 */
export const ConfigSchema = z
  .object({
    server: ServerConfigSchema,
    cors: CorsConfigSchema,
    jwt: JwtConfigSchema,
    database: DatabaseConfigSchema,
    apiKeys: ApiKeysConfigSchema,
    workflow: WorkflowConfigSchema,
    webhook: WebhookConfigSchema,
  })
  .transform((config) => {
    // Auto-generate Inngest keys from JWT_SECRET if not provided
    // Keys are stable across restarts and unique per installation

    if (!config.workflow.eventKey) {
      // Derive event key from JWT_SECRET
      const eventKeyHash = createHash("sha256")
        .update(`inngest-event-${config.jwt.secret}`)
        .digest("hex")
        .substring(0, 32); // Use first 32 chars for readability
      config.workflow.eventKey = eventKeyHash;
    }

    if (!config.workflow.signingKey) {
      // Derive signing key from JWT_SECRET
      const signingKeyHash = createHash("sha256")
        .update(`inngest-signing-${config.jwt.secret}`)
        .digest("hex");
      config.workflow.signingKey = signingKeyHash;
    }

    return config;
  });
