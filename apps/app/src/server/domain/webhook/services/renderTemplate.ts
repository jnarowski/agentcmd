// PUBLIC API

/**
 * Renders a template string by replacing {{path.to.field}} tokens with values from payload
 * Supports dot notation for nested paths
 * Returns empty string for missing values
 *
 * @param template - Template string with {{tokens}}
 * @param payload - Source data object
 * @returns Rendered string with tokens replaced
 *
 * @example
 * ```typescript
 * const template = "PR #{{pull_request.number}} by {{pull_request.user.login}}";
 * const payload = {
 *   pull_request: {
 *     number: 42,
 *     user: { login: "octocat" }
 *   }
 * };
 * const result = renderTemplate(template, payload);
 * // => "PR #42 by octocat"
 * ```
 */
export function renderTemplate(
  template: string,
  payload: Record<string, unknown>,
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
    const value = resolvePath(payload, path.trim());
    return value !== undefined && value !== null ? String(value) : "";
  });
}

// PRIVATE HELPERS

/**
 * Resolves a dot notation path to a value in an object
 */
function resolvePath(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}
