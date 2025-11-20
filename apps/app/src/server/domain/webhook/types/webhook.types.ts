import type { Webhook } from "@prisma/client";
import type { WebhookMappingFields } from "../constants/webhook.constants";

// PUBLIC API

// Re-export for convenience
export type { WebhookMappingFields };

/**
 * Mapping mode: simple (always applies) or conditional (first match wins)
 */
export type MappingMode = "simple" | "conditional";

/**
 * Default action when no conditions match
 */
export type DefaultAction = "skip" | "set_fields";

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
 * Mapping group with conditions and field values
 * Empty conditions array = always match (simple mode)
 */
export interface MappingGroup extends WebhookMappingFields {
  conditions: ConditionRule[]; // Empty = always match, else all must pass (AND)
}

/**
 * Simple mapping with no conditions (always matches)
 */
export type SimpleMapping = WebhookMappingFields;

/**
 * Source-specific configuration (HMAC settings)
 */
export interface SourceConfig {
  signature_header?: string; // Custom header name for generic webhooks
  hmac_method?: "sha1" | "sha256"; // HMAC algorithm for generic webhooks
}

/**
 * Full webhook configuration with unified mappings array
 */
export interface WebhookConfig {
  name: string; // Template for workflow run name with {{tokens}}
  spec_content?: string; // Template for spec content with {{tokens}}
  mappings: MappingGroup[]; // Unified array (empty conditions = simple, else conditional)
  default_action?: DefaultAction; // Only for conditional mode
  default_mapping?: WebhookMappingFields; // Only when default_action = "set_fields"
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
 * Note: config is unknown from HTTP request, validated in service layer
 */
export interface CreateWebhookData {
  project_id: string;
  name: string;
  description?: string;
  source?: "github" | "linear" | "jira" | "generic";
  secret?: string;
  workflow_identifier?: string;
  config?: unknown; // Validated to WebhookConfig in createWebhook service
}

/**
 * Update webhook request data
 * Note: config is unknown from HTTP request, validated in service layer
 */
export interface UpdateWebhookData {
  name?: string;
  description?: string;
  secret?: string;
  workflow_identifier?: string;
  config?: unknown; // Validated to WebhookConfig in updateWebhook service
}

/**
 * Matched condition with actual payload value for debugging
 */
export interface MatchedCondition {
  path: string;
  operator: ConditionalOperator;
  value: unknown; // Expected value from condition
  payload_value: unknown; // Actual value from payload
}

/**
 * Debug information about mapping resolution
 * Stored in WebhookEvent.mapped_data for troubleshooting
 */
export interface MappedDataDebugInfo {
  mapping_mode: MappingMode; // "simple" or "conditional"
  mapping_conditions_matched: MatchedCondition[] | null; // Conditions that matched (null for simple)
  used_default: boolean; // Whether default_mapping was used
  mapping: WebhookMappingFields; // Final mapping values applied
  spec_content_rendered?: string; // Rendered spec_content template
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
