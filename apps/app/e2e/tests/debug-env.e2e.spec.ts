import { test, expect } from "../fixtures";

/**
 * Temporary debug test to verify environment inheritance in Playwright.
 * DELETE THIS FILE after confirming the fix works.
 */
test.describe("Debug: Environment Check", () => {
  test("server should have inherited PATH and HOME", async ({ page }) => {
    // Check if the server can see claude in PATH by hitting a debug endpoint
    // For now, just verify the server is running with correct env
    const response = await page.request.get("http://localhost:5100/api/health");
    expect(response.ok()).toBe(true);

    const health = await response.json();
    console.log("\n=== Server Health ===");
    console.log(JSON.stringify(health, null, 2));

    // Log Playwright process env (should match what server gets)
    console.log("\n=== Playwright Process Env ===");
    console.log("PATH includes ~/.claude:", process.env.PATH?.includes(".claude") ?? false);
    console.log("HOME:", process.env.HOME);
    console.log("SHELL:", process.env.SHELL);
    console.log("ANTHROPIC_API_KEY set:", !!process.env.ANTHROPIC_API_KEY);

    // Try to find claude in PATH
    const { execSync } = await import("child_process");
    try {
      const claudePath = execSync("which claude", { encoding: "utf-8" }).trim();
      console.log("Claude CLI found at:", claudePath);
    } catch {
      console.log("Claude CLI: NOT FOUND in PATH");
    }
  });
});
