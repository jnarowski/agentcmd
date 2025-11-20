/**
 * Form validation schemas for webhook forms
 * Uses Zod for React Hook Form validation
 */

import { z } from "zod";

/**
 * Webhook sources
 */
export const webhookSourceSchema = z.enum([
  "github",
  "linear",
  "jira",
  "generic",
]);

/**
 * Conditional operators
 */
export const conditionalOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "greater_than",
  "less_than",
  "exists",
  "not_exists",
]);

/**
 * Field mapping types
 */
export const fieldMappingTypeSchema = z.enum(["input", "conditional"]);

/**
 * Condition rule schema
 */
export const conditionRuleSchema = z.object({
  path: z.string().min(1, "Path is required"),
  operator: conditionalOperatorSchema,
  value: z.unknown(),
});

/**
 * Conditional mapping schema
 */
export const conditionalMappingSchema = z.object({
  conditions: z.array(conditionRuleSchema).min(1, "At least one condition required"),
  value: z.string().min(1, "Value is required"),
});

/**
 * Field mapping schema
 */
export const fieldMappingSchema = z
  .object({
    type: fieldMappingTypeSchema,
    field: z.string().min(1, "Field name is required"),
    value: z.string().optional(),
    default: z.string().optional(),
    conditional_values: z.array(conditionalMappingSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.type === "input") {
        return data.value !== undefined && data.value.length > 0;
      }
      if (data.type === "conditional") {
        return data.conditional_values !== undefined && data.conditional_values.length > 0;
      }
      return true;
    },
    {
      message: "Input type requires value, conditional type requires conditional_values",
    },
  );

/**
 * Source config schema
 */
export const sourceConfigSchema = z.object({
  signature_header: z.string().optional(),
  hmac_method: z.enum(["sha1", "sha256"]).optional(),
});

/**
 * Webhook config schema
 */
export const webhookConfigSchema = z.object({
  field_mappings: z.array(fieldMappingSchema),
  source_config: sourceConfigSchema.optional(),
});

/**
 * Create webhook form schema
 */
export const createWebhookFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  description: z.string().max(1000, "Description too long").optional(),
  source: webhookSourceSchema,
  secret: z.string().optional(),
});

/**
 * Update webhook form schema
 */
export const updateWebhookFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  description: z.string().max(1000, "Description too long").optional(),
  source: webhookSourceSchema.optional(), // Optional for update, required for create
  secret: z.string().optional(), // Allow secret rotation (empty string = keep existing)
  workflow_identifier: z.string().optional(),
  config: webhookConfigSchema,
  webhook_conditions: z.array(conditionRuleSchema),
});

/**
 * Type inference for forms
 */
export type CreateWebhookFormValues = z.infer<typeof createWebhookFormSchema>;
export type UpdateWebhookFormValues = z.infer<typeof updateWebhookFormSchema>;
export type WebhookFormData = UpdateWebhookFormValues;
