import type { Webhook } from "@prisma/client";

// PUBLIC API

/**
 * Field mapping types: determines how values are resolved
 */
export type FieldMappingType = "input" | "conditional";

/**
 * Conditional operators for evaluating webhook payloads
 */
export type ConditionalOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "exists"
  | "not_exists";

/**
 * Condition rule for evaluating payload values
 */
export interface ConditionRule {
  path: string; // Dot notation path to value (e.g., "pull_request.state")
  operator: ConditionalOperator;
  value: unknown; // Value to compare against
}

/**
 * Conditional field mapping with if/then logic
 */
export interface ConditionalMapping {
  conditions: ConditionRule[]; // All must pass (AND logic)
  value: string; // Template value to use if conditions match
}

/**
 * Field mapping configuration (input or conditional)
 */
export interface FieldMapping {
  type: FieldMappingType;
  field: string; // Target field name
  value?: string; // Template for input type
  default?: string; // Default value if no conditions match
  conditionals?: ConditionalMapping[]; // Rules for conditional type
}

/**
 * Source-specific configuration (HMAC settings)
 */
export interface SourceConfig {
  signature_header?: string; // Custom header name for generic webhooks
  hmac_method?: "sha1" | "sha256"; // HMAC algorithm for generic webhooks
}

/**
 * Full webhook configuration
 */
export interface WebhookConfig {
  field_mappings: FieldMapping[]; // How to map payload to workflow args
  source_config?: SourceConfig; // Source-specific settings
}

/**
 * Webhook with typed config
 */
export interface WebhookWithConfig extends Omit<Webhook, "config"> {
  config: WebhookConfig;
}

/**
 * Create webhook request data
 */
export interface CreateWebhookData {
  project_id: string;
  name: string;
  description?: string;
  source?: "github" | "linear" | "jira" | "generic";
  workflow_identifier?: string;
  config?: WebhookConfig;
  webhook_conditions?: ConditionRule[];
}

/**
 * Update webhook request data
 */
export interface UpdateWebhookData {
  name?: string;
  description?: string;
  workflow_identifier?: string;
  config?: WebhookConfig;
  webhook_conditions?: ConditionRule[];
}

/**
 * Webhook event with processed data (not extending WebhookEvent to avoid type conflicts)
 */
export interface ProcessedWebhookEvent {
  id: string;
  webhook_id: string;
  workflow_run_id?: string | null;
  status: string;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  mapped_data?: Record<string, unknown>;
  error_message?: string | null;
  processing_time_ms?: number | null;
  created_at: Date;
}

/**
 * Result of processing a webhook event
 */
export interface WebhookProcessingResult {
  success: boolean;
  event_id: string;
  workflow_run_id?: string;
  status:
    | "test"
    | "success"
    | "filtered"
    | "invalid_signature"
    | "failed"
    | "error";
  error_message?: string;
  processing_time_ms: number;
}

/**
 * Signature validation result
 */
export interface SignatureValidationResult {
  valid: boolean;
  error?: string;
}
