/**
 * Sanitizes data for safe JSON storage in SQLite
 * - Removes circular references
 * - Converts undefined to null
 * - Handles special types (BigInt, Date, RegExp)
 * - Truncates large strings
 * - Strips functions
 * - Redacts sensitive keys
 */

interface SanitizeOptions {
  maxStringLength?: number;
  redactKeys?: string[];
}

const DEFAULT_OPTIONS: Required<SanitizeOptions> = {
  maxStringLength: 10_000,
  redactKeys: ['apiKey', 'token', 'password', 'secret', 'apikey', 'api_key'],
};

export function sanitizeJson(
  data: unknown,
  options: SanitizeOptions = {}
): unknown {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const seen = new WeakSet();

  function sanitize(value: unknown, key?: string): unknown {
    // Handle primitives
    if (value === null) return null;
    if (value === undefined) return null;
    if (typeof value === 'string') {
      // Redact sensitive keys
      if (key && opts.redactKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
        return '[REDACTED]';
      }
      // Truncate long strings
      if (value.length > opts.maxStringLength) {
        return value.slice(0, opts.maxStringLength) + '... [truncated]';
      }
      return value;
    }
    if (typeof value === 'number') {
      // Handle NaN, Infinity
      if (!Number.isFinite(value)) return null;
      return value;
    }
    if (typeof value === 'boolean') return value;

    // Strip functions
    if (typeof value === 'function') return null;

    // Handle special types
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (value instanceof RegExp) return value.toString();
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack?.slice(0, opts.maxStringLength),
      };
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item, index) => sanitize(item, `${key}[${index}]`));
    }

    // Handle objects
    if (typeof value === 'object') {
      // Detect circular references
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);

      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = sanitize(v, k);
      }
      return result;
    }

    // Unknown type
    return null;
  }

  return sanitize(data);
}
