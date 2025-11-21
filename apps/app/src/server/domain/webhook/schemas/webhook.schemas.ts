import { z } from "zod";
import {
  CONDITIONAL_OPERATORS,
  HMAC_METHODS,
  WEBHOOK_SOURCES,
  WEBHOOK_STATUSES,
  WEBHOOK_EVENT_STATUSES,
} from "../constants/webhook.constants";

// PUBLIC API

/**
 * Conditional operator schema
 */
export const conditionalOperatorSchema = z.enum(CONDITIONAL_OPERATORS);

/**
 * Condition rule schema
 */
export const conditionRuleSchema = z.object({
  path: z.string().min(1),
  operator: conditionalOperatorSchema,
  value: z.unknown(),
});

/**
 * Simple mapping schema (no conditions, always matches)
 */
export const simpleMappingSchema = z.object({
  spec_type_id: z.string().min(1),
  workflow_definition_id: z.string().min(1),
});

/**
 * Mapping group schema (with conditions)
 */
export const mappingGroupSchema = z.object({
  spec_type_id: z.string().min(1),
  workflow_definition_id: z.string().min(1),
  conditions: z.array(conditionRuleSchema), // Empty array = always match
});

/**
 * Source config schema
 */
export const sourceConfigSchema = z.object({
  signature_header: z.string().optional(),
  hmac_method: z.enum(HMAC_METHODS).optional(),
});

/**
 * Webhook config schema with unified mappings array
 */
export const webhookConfigSchema = z
  .object({
    name: z.string().min(1), // Template for workflow run name with {{tokens}}
    spec_content: z.string().optional(), // Template for spec content with {{tokens}}
    mappings: z.array(mappingGroupSchema).default([]),
    default_action: z.enum(["skip", "set_fields"]).optional(),
    default_mapping: simpleMappingSchema.optional(),
    source_config: sourceConfigSchema.optional(),
  })
  .refine(
    (data) => {
      // Allow empty mappings array (draft webhooks)
      if (data.mappings.length === 0) {
        return true;
      }

      const hasNonEmptyConditions = data.mappings.some(
        (m) => m.conditions.length > 0,
      );
      const allEmptyConditions = data.mappings.every(
        (m) => m.conditions.length === 0,
      );

      // Simple mode: exactly 1 mapping with empty conditions, no default_action
      if (data.mappings.length === 1 && allEmptyConditions) {
        return data.default_action === undefined;
      }

      // Multiple mappings with all empty conditions: default_action required
      if (data.mappings.length > 1 && allEmptyConditions) {
        return data.default_action !== undefined;
      }

      // Conditional mode: at least one mapping with conditions, default_action required
      if (hasNonEmptyConditions) {
        return data.default_action !== undefined;
      }

      return true;
    },
    {
      message:
        "Simple mode (1 mapping with empty conditions) requires no default_action. Multiple mappings or conditional mode require default_action.",
    },
  );

/**
 * Webhook source schema
 */
export const webhookSourceSchema = z.enum(WEBHOOK_SOURCES);

/**
 * Webhook status schema
 */
export const webhookStatusSchema = z.enum(WEBHOOK_STATUSES);

/**
 * Webhook event status schema
 */
export const webhookEventStatusSchema = z.enum(WEBHOOK_EVENT_STATUSES);

/**
 * Create webhook schema
 * Note: config validation happens in service layer (createWebhook) to avoid Fastify serialization issues
 */
export const createWebhookSchema = z.object({
  project_id: z.string().min(1).optional(), // Optional because route handler adds it from URL params
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  source: webhookSourceSchema.optional().default("generic"),
  secret: z.string().optional(), // HMAC secret from external service (e.g., Linear signing secret)
  config: z.unknown().optional(), // Validated in service layer
});

/**
 * Update webhook schema
 * Note: config validation happens in service layer (updateWebhook) to avoid Fastify serialization issues
 */
export const updateWebhookSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  secret: z.string().min(1).optional(), // Allow secret rotation
  config: z.unknown().optional(), // Validated in service layer
});
