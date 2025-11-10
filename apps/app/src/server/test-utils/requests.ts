import type { FastifyInstance } from "fastify";
import type { Response as LightMyRequestResponse } from "light-my-request";
import type { z } from "zod";

/**
 * Parse and validate inject response body with Zod schema
 * Provides type-safe responses with runtime validation
 *
 * @param response - Response from app.inject()
 * @param schema - Zod schema to validate against
 * @returns Parsed and validated response body (fully typed)
 *
 * @example
 * const response = await app.inject({ method: "GET", url: "/api/projects" });
 * const body = parseResponse({ response, schema: projectsResponseSchema });
 * body.data[0].name; // Fully typed!
 */
export function parseResponse<T>({
  response,
  schema,
}: {
  response: LightMyRequestResponse;
  schema: z.ZodSchema<T>;
}): T {
  return schema.parse(JSON.parse(response.body));
}

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
