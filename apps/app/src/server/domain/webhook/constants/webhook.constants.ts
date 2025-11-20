// PUBLIC API

/**
 * Fields that can be mapped from webhook payloads to workflow runs
 * To add new fields: extend this array and WebhookMappingFields type
 * Example: ["spec_type_id", "workflow_id", "mode", "branch_name"] as const
 */
export const WEBHOOK_MAPPING_FIELDS = ["spec_type_id", "workflow_id"] as const;

// Export type for use in types file
// Defined here to avoid circular dependency
/**
 * Type-safe mapping fields derived from constant
 */
export interface WebhookMappingFields {
  spec_type_id: string;
  workflow_id: string;
}

/**
 * Rate limit for public webhook endpoint
 */
export const WEBHOOK_RATE_LIMIT = {
  max: 100, // Maximum requests
  timeWindow: 60000, // Per minute (60000ms)
} as const;

/**
 * Default webhook config
 */
export const DEFAULT_WEBHOOK_CONFIG = {
  name: "Webhook Run",
  mappings: [],
  source_config: {},
};

/**
 * Supported webhook sources
 */
export const WEBHOOK_SOURCES = ["github", "linear", "jira", "generic"] as const;

/**
 * Webhook statuses
 */
export const WEBHOOK_STATUSES = [
  "draft",
  "active",
  "paused",
  "error",
] as const;

/**
 * Webhook event statuses
 */
export const WEBHOOK_EVENT_STATUSES = [
  "test",
  "success",
  "filtered",
  "invalid_signature",
  "failed",
  "error",
] as const;

/**
 * Conditional operators
 */
export const CONDITIONAL_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "greater_than",
  "less_than",
  "exists",
  "not_exists",
] as const;

/**
 * Field mapping types
 */
export const FIELD_MAPPING_TYPES = ["input", "conditional"] as const;

/**
 * HMAC methods for generic webhooks
 */
export const HMAC_METHODS = ["sha1", "sha256"] as const;

/**
 * GitHub webhook signature header
 */
export const GITHUB_SIGNATURE_HEADER = "x-hub-signature-256";

/**
 * Linear webhook signature header
 */
export const LINEAR_SIGNATURE_HEADER = "linear-signature";

/**
 * Jira webhook signature header
 */
export const JIRA_SIGNATURE_HEADER = "x-hub-signature";

/**
 * Secret byte length for webhook secrets
 */
export const WEBHOOK_SECRET_BYTES = 32;
