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
 * Condition rule schema
 */
export const conditionRuleSchema = z.object({
  path: z.string().min(1, "Path is required"),
  operator: conditionalOperatorSchema,
  value: z.unknown(),
});

/**
 * Simple mapping schema (no conditions)
 */
export const simpleMappingSchema = z.object({
  spec_type_id: z.string().min(1, "Spec type is required"),
  workflow_definition_id: z.string().min(1, "Workflow is required"),
});

/**
 * Mapping group schema (with conditions)
 */
export const mappingGroupSchema = z.object({
  spec_type_id: z.string().min(1, "Spec type is required"),
  workflow_definition_id: z.string().min(1, "Workflow is required"),
  conditions: z.array(conditionRuleSchema), // Empty array = always match
});

/**
 * Source config schema
 */
export const sourceConfigSchema = z.object({
  signature_header: z.string().optional(),
  hmac_method: z.enum(["sha1", "sha256"]).optional(),
});

/**
 * Webhook config schema with unified mappings array
 */
export const webhookConfigSchema = z
  .object({
    name: z.string().min(1, "Workflow run name is required"),
    spec_content: z.string().optional(),
    mappings: z.array(mappingGroupSchema).min(1, "At least one mapping required"),
    default_action: z.enum(["skip", "set_fields"]).optional(),
    default_mapping: simpleMappingSchema.optional(),
    source_config: sourceConfigSchema.optional(),
  })
  .refine(
    (data) => {
      const hasEmptyConditions = data.mappings.some((m) => m.conditions.length === 0);
      const hasNonEmptyConditions = data.mappings.some((m) => m.conditions.length > 0);

      // Simple mode: exactly 1 mapping with empty conditions, no default_action
      if (hasEmptyConditions && data.mappings.length === 1) {
        return data.default_action === undefined;
      }

      // Conditional mode: at least one mapping with conditions, default_action required
      if (hasNonEmptyConditions) {
        return data.default_action !== undefined;
      }

      return true;
    },
    {
      message: "Simple mode: 1 mapping with empty conditions. Conditional mode: default_action required.",
    },
  );

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
  config: webhookConfigSchema.optional(),
});

/**
 * Type inference for forms
 */
export type CreateWebhookFormValues = z.infer<typeof createWebhookFormSchema>;
export type UpdateWebhookFormValues = z.infer<typeof updateWebhookFormSchema>;
export type WebhookFormData = UpdateWebhookFormValues;
