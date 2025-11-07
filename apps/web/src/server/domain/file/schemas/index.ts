/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

/**
 * File Domain Validation Schemas
 *
 * Zod schemas for validating file operations and responses
 */

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * File tree item schema (recursive)
 *
 * Represents a file or directory with optional children
 */
export const fileTreeItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    path: z.string(),
    type: z.enum(['file', 'directory']),
    size: z.number().optional(),
    modified: z.date(),
    permissions: z.string(),
    children: z.array(fileTreeItemSchema).optional(),
  })
);

/**
 * File tree response wrapper
 */
export const fileTreeResponseSchema = z.object({
  data: z.array(fileTreeItemSchema),
});

/**
 * File content response schema
 */
export const fileContentResponseSchema = z.object({
  content: z.string(),
});

/**
 * File content save response schema
 */
export const fileContentSaveResponseSchema = z.object({
  success: z.boolean(),
});
