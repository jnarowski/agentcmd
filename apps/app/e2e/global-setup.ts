import { execSync } from "node:child_process";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test user credentials (shared across all tests)
const TEST_USER = {
  email: "e2e-test@example.com",
  password: "e2e-test-password-123",
};

const API_BASE = "http://localhost:5100";

/**
 * Global Setup for E2E Tests
 *
 * Responsibilities:
 * 1. Create e2e.db if it doesn't exist
 * 2. Verify E2E server health
 * 3. Login or register test user
 * 4. Save auth state for tests
 */

export default async function globalSetup() {
  console.log("\n[E2E Setup]");

  // 1. Create e2e.db if it doesn't exist or is empty
  const e2eDbPath = join(__dirname, "..", "prisma", "e2e.db");
  const needsSetup = !existsSync(e2eDbPath) || statSync(e2eDbPath).size === 0;

  if (needsSetup) {
    console.log("Creating e2e.db schema...");
    const env = { ...process.env };
    env.DATABASE_URL = `file:${e2eDbPath}`;
    env.DOTENV_CONFIG_PATH = "/dev/null";

    // Prisma 7 removed --skip-generate flag
    execSync("pnpm prisma db push --accept-data-loss", {
      stdio: "inherit",
      cwd: join(__dirname, ".."),
      env,
    });
    console.log("✓ e2e.db schema created");
  } else {
    console.log("✓ e2e.db ready");
  }

  const authStatePath = join(__dirname, ".auth-state.json");

  // 1. Verify E2E server health
  const maxRetries = 30;
  const retryDelay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      if (response.ok) {
        console.log("✓ Server healthy");
        break;
      }
    } catch {
      // Server not ready yet
    }

    if (i === maxRetries - 1) {
      throw new Error(
        "✗ Server health check failed. Make sure 'pnpm e2e:server' is running."
      );
    }

    console.log(`  Waiting for server... (${i + 1}/${maxRetries})`);
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }

  // 2. Try to login first, register if needed

  let authData: { user: { id: string; email: string }; token: string };

  // Try login first
  const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
  });

  if (loginResponse.ok) {
    authData = await loginResponse.json();
    console.log("✓ Auth ready (existing user)");
  } else {
    // Login failed, try to register
    const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
    });

    if (!registerResponse.ok) {
      const errorText = await registerResponse.text();
      throw new Error(`✗ Failed to register test user: ${errorText}`);
    }

    authData = await registerResponse.json();
    console.log("✓ Auth ready (new user)");
  }

  // 3. Save auth state for tests to use
  const authState = {
    user: {
      id: authData.user.id,
      email: authData.user.email,
    },
    token: authData.token,
    credentials: TEST_USER,
  };

  writeFileSync(authStatePath, JSON.stringify(authState, null, 2));
  console.log("✓ Setup complete\n");
}
