/**
 * JWT Payload Interface
 *
 * Standard payload structure for JWT tokens used throughout the application.
 * Contains minimal user information needed for authentication and authorization.
 */
export interface JWTPayload {
  userId: string;
  email: string;
}
