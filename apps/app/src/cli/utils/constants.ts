/**
 * Central constants for CLI configuration and branding
 * Change CLI_NAME here to rebrand the entire tool
 */

import { INNGEST_DEFAULTS } from "@/shared/utils/inngestEnv";

export const CLI_NAME = "agentcmd";

// Pinned dependency versions for CLI
export const PRISMA_VERSION = "prisma@7.0";
export const INNGEST_CLI_VERSION = "inngest-cli@1.14.0";

// Default port configuration
export const DEFAULT_PORT = 4100;
export const DEFAULT_EXTERNAL_HOST = "localhost";

// Re-export Inngest defaults for backwards compatibility
export const DEFAULT_INNGEST_PORT = INNGEST_DEFAULTS.PORT;
export const DEFAULT_HOST = INNGEST_DEFAULTS.HOST;

// Default logging configuration
export const DEFAULT_LOG_LEVEL = "info";

// Default allowed origins
export const DEFAULT_ALLOWED_ORIGINS = `http://localhost:${DEFAULT_PORT}`;
