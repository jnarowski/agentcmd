import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import pc from "picocolors";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Validate Anthropic API key format
 */
export function validateAnthropicKeyFormat(key: string): boolean {
  return key.startsWith("sk-ant-") && key.length > 50 && key.length < 250;
}

/**
 * Validate OpenAI API key format
 */
export function validateOpenAIKeyFormat(key: string): boolean {
  return key.startsWith("sk-") && key.length > 20 && key.length < 100;
}

/**
 * Test Anthropic API key with a simple API call
 */
export async function testAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 10,
        messages: [{ role: "user", content: "test" }],
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Test OpenAI API key with a simple API call
 */
export async function testOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Prompt for Anthropic API key with validation
 * @param skipMessage - Optional message to show when user skips
 * @returns API key or empty string if skipped
 */
export async function promptForAnthropicKey(skipMessage?: string): Promise<string> {
  const rl = readline.createInterface({ input, output });

  console.log("");
  console.log(pc.bold(pc.cyan("┌─ Configure API Keys (optional)")));
  console.log(pc.cyan("│"));
  console.log(pc.cyan("│") + "  " + pc.bold("Anthropic API Key"));
  console.log(pc.cyan("│") + "  " + pc.dim("Required for workflow step.ai features using the Anthropic model"));
  console.log(pc.cyan("│") + "  " + pc.blue("https://console.anthropic.com/settings/keys"));
  console.log(pc.cyan("│"));

  const apiKey = await rl.question(pc.cyan("└─ ") + "Enter key (or press Enter to skip): ");
  rl.close();

  const trimmed = apiKey.trim();
  if (!trimmed) {
    const defaultMessage = "Skipped Anthropic - add later by editing config";
    console.log(pc.yellow("   ⚠ " + (skipMessage || defaultMessage)));
    return "";
  }

  // Validate format
  if (!validateAnthropicKeyFormat(trimmed)) {
    console.log(pc.yellow("   ⚠ Invalid Anthropic format") + pc.dim(" (expected sk-ant-...)"));
    return "";
  }

  // Test API key
  output.write(pc.cyan("   ⠋ Validating..."));
  const isValid = await testAnthropicKey(trimmed);
  output.write("\r");

  if (isValid) {
    console.log(pc.green("   ✓ Anthropic API key verified"));
  } else {
    console.log(pc.yellow("   ✗ Anthropic API key validation failed") + pc.dim(" (continuing anyway)"));
  }

  return trimmed;
}

/**
 * Prompt for OpenAI API key with validation
 * @param skipMessage - Optional message to show when user skips
 * @returns API key or empty string if skipped
 */
export async function promptForOpenAIKey(skipMessage?: string): Promise<string> {
  const rl = readline.createInterface({ input, output });

  console.log("");
  console.log(pc.bold(pc.cyan("┌─ OpenAI API Key")));
  console.log(pc.cyan("│"));
  console.log(pc.cyan("│") + "  " + pc.dim("Required for workflow step.ai features using the OpenAI model"));
  console.log(pc.cyan("│") + "  " + pc.blue("https://platform.openai.com/api-keys"));
  console.log(pc.cyan("│"));

  const apiKey = await rl.question(pc.cyan("└─ ") + "Enter key (or press Enter to skip): ");
  rl.close();

  const trimmed = apiKey.trim();
  if (!trimmed) {
    const defaultMessage = "Skipped OpenAI - add later by editing config";
    console.log(pc.yellow("   ⚠ " + (skipMessage || defaultMessage)));
    return "";
  }

  // Validate format
  if (!validateOpenAIKeyFormat(trimmed)) {
    console.log(pc.yellow("   ⚠ Invalid OpenAI format") + pc.dim(" (expected sk-...)"));
    return "";
  }

  // Test API key
  output.write(pc.cyan("   ⠋ Validating..."));
  const isValid = await testOpenAIKey(trimmed);
  output.write("\r");

  if (isValid) {
    console.log(pc.green("   ✓ OpenAI API key verified"));
  } else {
    console.log(pc.yellow("   ✗ OpenAI API key validation failed") + pc.dim(" (continuing anyway)"));
  }

  return trimmed;
}
