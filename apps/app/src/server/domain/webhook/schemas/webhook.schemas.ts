import { z } from "zod";
import {
  CONDITIONAL_OPERATORS,
  FIELD_MAPPING_TYPES,
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
 * Conditional mapping schema
 */
export const conditionalMappingSchema = z.object({
  conditions: z.array(conditionRuleSchema).min(1),
  value: z.string(),
});

/**
 * Field mapping type schema
 */
export const fieldMappingTypeSchema = z.enum(FIELD_MAPPING_TYPES);

/**
 * Field mapping schema
 */
export const fieldMappingSchema = z
  .object({
    type: fieldMappingTypeSchema,
    field: z.string().min(1),
    value: z.string().optional(),
    default: z.string().optional(),
    conditionals: z.array(conditionalMappingSchema).optional(),
  })
  .refine(
    (data) => {
      // Input type must have value
      if (data.type === "input") {
        return data.value !== undefined;
      }
      // Conditional type must have conditionals array
      if (data.type === "conditional") {
        return (
          data.conditionals !== undefined && data.conditionals.length > 0
        );
      }
      return true;
    },
    {
      message:
        "Input type requires 'value', conditional type requires 'conditionals'",
    },
  );

/**
 * Source config schema
 */
export const sourceConfigSchema = z.object({
  signature_header: z.string().optional(),
  hmac_method: z.enum(HMAC_METHODS).optional(),
});

/**
 * Webhook config schema
 */
export const webhookConfigSchema = z.object({
  field_mappings: z.array(fieldMappingSchema),
  source_config: sourceConfigSchema.optional(),
});

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
 */
export const createWebhookSchema = z.object({
  project_id: z.string().min(1).optional(), // Optional because route handler adds it from URL params
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  source: webhookSourceSchema.optional().default("generic"),
  secret: z.string().optional(), // HMAC secret from external service (e.g., Linear signing secret)
  workflow_identifier: z.string().optional(),
  config: webhookConfigSchema.optional(),
  webhook_conditions: z.array(conditionRuleSchema).optional(),
});

/**
 * Update webhook schema
 */
export const updateWebhookSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  secret: z.string().min(1).optional(), // Allow secret rotation
  workflow_identifier: z.string().optional(),
  config: webhookConfigSchema.optional(),
  webhook_conditions: z.array(conditionRuleSchema).optional(),
});
