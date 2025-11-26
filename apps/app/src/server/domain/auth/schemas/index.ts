import { z } from 'zod';

/**
 * Authentication Validation Schemas
 *
 * Zod schemas for validating authentication requests and responses
 */

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Registration schema
 *
 * Validates user registration requests with email and password
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Login schema
 *
 * Validates user login requests with email and password
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Type inference for registration input
 */
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Type inference for login input
 */
export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * User schema
 *
 * Basic user information returned in responses
 */
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
});

/**
 * Auth status response schema
 *
 * Returns setup requirements and authentication status
 */
export const authStatusResponseSchema = z.object({
  needsSetup: z.boolean(),
  isAuthenticated: z.boolean(),
});

/**
 * Auth login/register response schema
 *
 * Note: Does not use standard wrapper format
 */
export const authResponseSchema = z.object({
  success: z.boolean(),
  user: userSchema,
  token: z.string(),
});

/**
 * Standard user response wrapper
 */
export const userResponseSchema = z.object({
  data: userSchema,
});
