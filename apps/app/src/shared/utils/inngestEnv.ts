/**
 * Inngest environment configuration options
 */
export interface InngestEnvOptions {
  /** Inngest dev server port (default: 8288) */
  port?: number;
  /** Inngest dev server host (default: INNGEST_HOST env var or 127.0.0.1) */
  host?: string;
}

/**
 * Configure Inngest environment variables for dev mode
 *
 * Sets INNGEST_PORT and INNGEST_BASE_URL for Inngest CLI and SDK.
 * Call this BEFORE any Inngest SDK imports.
 *
 * Priority: explicit options > environment variables > defaults
 *
 * @param options - Optional port and host overrides
 *
 * @example
 * // Use defaults (INNGEST_PORT env or 8288, INNGEST_HOST env or 127.0.0.1)
 * setInngestEnvironment();
 *
 * @example
 * // Custom port from config
 * setInngestEnvironment({ port: 9000 });
 */
export function setInngestEnvironment(options?: InngestEnvOptions): void {
  // Priority: explicit > INNGEST_HOST env > default (always localhost for connections)
  // Note: Don't use HOST env var - that's for server binding (can be 0.0.0.0)
  const host = options?.host ?? process.env.INNGEST_HOST ?? "127.0.0.1";

  const port =
    options?.port ??
    (process.env.INNGEST_PORT ? parseInt(process.env.INNGEST_PORT) : null) ??
    8288;

  // Set Inngest environment variables for self-hosted `inngest start`
  // INNGEST_DEV=0 disables dev mode to use self-hosted server with authentication
  // INNGEST_BASE_URL points SDK to local Inngest server
  process.env.INNGEST_PORT = port.toString();
  process.env.INNGEST_BASE_URL = `http://${host}:${port}`;
  process.env.INNGEST_DEV = "0";
}
