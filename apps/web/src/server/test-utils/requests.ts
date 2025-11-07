import type { FastifyInstance } from "fastify";

/**
 * Make an authenticated HTTP request in tests
 * Automatically generates JWT token and sets authorization header
 *
 * @param app - Fastify instance with JWT plugin
 * @param user - User object with id and email for token generation
 * @param options - Request options (method, url, body, query)
 * @returns Response from app.inject()
 */
export async function makeAuthenticatedRequest(
  app: FastifyInstance,
  user: { id: string; email: string },
  options: {
    method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
    url: string;
    body?: unknown;
    query?: Record<string, string>;
  }
) {
  const token = app.jwt.sign({ userId: user.id, email: user.email });

  return await app.inject({
    method: options.method,
    url: options.url,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    ...(options.body ? { payload: options.body } : {}),
    ...(options.query ? { query: options.query } : {}),
  });
}
