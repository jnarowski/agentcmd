import { z } from 'zod';

/**
 * Common Cross-Cutting Schemas
 *
 * Validation schemas used across multiple domains
 */

// ============================================================================
// Route Params
// ============================================================================

/**
 * Slash command params schema
 *
 * Validates slash command route parameters
 */
export const slashCommandParamsSchema = z.object({
  id: z.string(),
});

// ============================================================================
// Generic Response Wrappers
// ============================================================================

/**
 * Standard success response wrapper
 *
 * Wraps any data schema in a standard { data: T } format
 *
 * @example
 * const projectListSchema = successResponse(z.array(projectSchema));
 */
export const successResponse = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
  });

/**
 * Standard error response schema
 *
 * Used for consistent error responses across all endpoints
 *
 * @example
 * {
 *   error: {
 *     message: "Project not found",
 *     code: "NOT_FOUND",
 *     statusCode: 404
 *   }
 * }
 */
export const errorResponse = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    statusCode: z.number(),
    details: z.unknown().optional(),
  }),
});
