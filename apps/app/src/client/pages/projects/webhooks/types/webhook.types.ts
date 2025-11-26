/**
 * Frontend webhook type definitions
 * Aligned with backend types but tailored for UI needs
 */

import type {
  ConditionalOperator,
  MappingMode,
  DefaultAction,
  WebhookMappingFields,
} from "@/server/domain/webhook/types/webhook.types";

// Re-export backend types used in frontend
export type { ConditionalOperator, MappingMode, DefaultAction, WebhookMappingFields };

/**
 * Webhook source types
 */
export type WebhookSource = "github" | "linear" | "jira" | "generic";

/**
 * Webhook status types
 */
export type WebhookStatus = "draft" | "active" | "paused" | "error";

/**
 * Webhook event status types
 */
export type WebhookEventStatus =
  | "test"
  | "success"
  | "filtered"
  | "invalid_signature"
  | "failed"
  | "error";

/**
 * Condition rule for webhook filtering
 */
export interface ConditionRule {
  path: string;
  operator: ConditionalOperator;
  value: unknown;
}

/**
 * Mapping group with conditions and field values
 */
export interface MappingGroup extends WebhookMappingFields {
  conditions: ConditionRule[]; // Empty = always match
}

/**
 * Source-specific configuration
 */
export interface SourceConfig {
  signature_header?: string;
  hmac_method?: "sha1" | "sha256";
}

/**
 * Webhook configuration (unified mappings array)
 */
export interface WebhookConfig {
  name: string; // Template for workflow run name with {{tokens}}
  spec_content?: string; // Template for spec content with {{tokens}}
  mappings: MappingGroup[];
  default_action?: DefaultAction;
  default_mapping?: WebhookMappingFields;
  source_config?: SourceConfig;
}

/**
 * Webhook model (frontend)
 */
export interface Webhook {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  source: WebhookSource;
  webhook_url: string;
  secret: string;
  status: WebhookStatus;
  config: WebhookConfig;
  last_triggered_at: Date | null;
  last_error: string | null;
  error_count: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Webhook event model (frontend)
 */
export interface WebhookEvent {
  id: string;
  webhook_id: string;
  workflow_run_id: string | null;
  status: WebhookEventStatus;
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  mapped_data: Record<string, unknown> | null;
  error_message: string | null;
  processing_time_ms: number | null;
  created_at: Date;
}

/**
 * Create webhook form data
 */
export interface CreateWebhookFormData {
  name: string;
  description?: string;
  source: WebhookSource;
}

/**
 * Update webhook form data
 */
export interface UpdateWebhookFormData {
  name: string;
  description?: string;
  config: WebhookConfig;
}

/**
 * Combined form data for create/update
 */
export type WebhookFormData = CreateWebhookFormData | UpdateWebhookFormData;

/**
 * WebSocket event payload for webhook events
 */
export interface WebhookEventNotification {
  type: "webhook.event_received";
  webhookId: string;
  event: {
    id: string;
    status: WebhookEventStatus;
    created_at: string;
  };
}

/**
 * Flattened payload path (for token picker)
 */
export interface FlattenedPayloadPath {
  path: string;
  preview: string;
  type: string;
}
