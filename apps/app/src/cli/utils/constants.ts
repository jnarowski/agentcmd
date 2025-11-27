/**
 * Central constants for CLI configuration and branding
 * Change CLI_NAME here to rebrand the entire tool
 */

export const CLI_NAME = "agentcmd";

// Pinned dependency versions for CLI
export const PRISMA_VERSION = "prisma@7.0";
export const INNGEST_CLI_VERSION = "inngest-cli@1.14.0";

// Default port configuration
export const DEFAULT_PORT = 4100;
export const DEFAULT_INNGEST_PORT = 8288;
export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_EXTERNAL_HOST = "localhost";

// Default logging configuration
export const DEFAULT_LOG_LEVEL = "info";

// Default allowed origins
export const DEFAULT_ALLOWED_ORIGINS = `http://localhost:${DEFAULT_PORT}`;
