/**
 * Zod validation schemas for agent session endpoints
 */
import { z } from 'zod';

/**
 * Agent session metadata schema
 */
export const agentSessionMetadataSchema = z.object({
  totalTokens: z.number().int().nonnegative(),
  messageCount: z.number().int().nonnegative(),
  lastMessageAt: z.string().datetime(),
  firstMessagePreview: z.string(),
});

/**
 * Create session request schema
 * Note: Session IDs are JSONL filenames, not UUIDs
 */
export const createSessionSchema = z.object({
  sessionId: z.string().min(1),
  agent: z.enum(['claude', 'codex', 'cursor', 'gemini']).optional().default('claude'),
});

/**
 * Update session metadata request schema
 */
export const updateSessionMetadataSchema = z.object({
  metadata: agentSessionMetadataSchema.partial(),
});

/**
 * Update session name request schema
 */
export const updateSessionNameSchema = z.object({
  name: z.string().min(1).max(255),
});

/**
 * Update session request schema (for generic updates)
 */
export const updateSessionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  permission_mode: z.enum(['default', 'plan', 'acceptEdits', 'bypassPermissions']).optional(),
});

/**
 * Session ID parameter schema
 * Note: Session IDs are JSONL filenames, not UUIDs (e.g., timestamp-based strings)
 */
export const sessionIdSchema = z.object({
  sessionId: z.string().min(1),
});

/**
 * Project ID parameter schema
 */
export const projectIdSchema = z.object({
  id: z.string().cuid(),
});

/**
 * Sync sessions request schema
 */
export const syncSessionsSchema = z.object({
  projectId: z.string().cuid(),
});

/**
 * Session response schema
 */
export const sessionResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().cuid(),
  userId: z.string().uuid(),
  name: z.string().optional(),
  agent: z.enum(['claude', 'codex', 'cursor', 'gemini']),
  cli_session_id: z.string().optional(),
  session_path: z.string().optional(),
  metadata: agentSessionMetadataSchema,
  state: z.enum(['idle', 'working', 'error']),
  error_message: z.string().optional(),
  is_archived: z.boolean(),
  archived_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

/**
 * Sync sessions response schema
 */
export const syncSessionsResponseSchema = z.object({
  synced: z.number().int().nonnegative(),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
});
