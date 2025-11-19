import http from "http";

export interface WaitForServerOptions {
  timeout?: number;
  interval?: number;
}

/**
 * Wait for server to be ready by polling health endpoint
 */
export async function waitForServerReady(
  url: string,
  options: WaitForServerOptions = {}
): Promise<void> {
  const { timeout = 30000, interval = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Health check returned ${res.statusCode}`));
          }
        });
        req.on("error", reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error("Health check timeout"));
        });
      });
      return; // Success!
    } catch {
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  throw new Error(`Server did not become ready within ${timeout}ms`);
}
