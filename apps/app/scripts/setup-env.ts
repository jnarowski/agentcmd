#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { showWelcomeBanner, showSuccessBox, showErrorBox } from "../src/cli/utils/branding";
import { promptForAnthropicKey } from "../src/cli/utils/prompts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

const envPath = join(rootDir, ".env");
const envExamplePath = join(rootDir, ".env.example");

/**
 * Generate a secure random secret for JWT signing
 */
function generateSecret(): string {
  return randomBytes(32).toString("base64");
}

/**
 * Process environment template by replacing placeholders with secure values
 */
function processEnvTemplate(template: string, jwtSecret: string, anthropicApiKey: string): string {
  let processed = template;

  // Replace JWT_SECRET placeholder with generated secure secret
  processed = processed.replace(
    /^JWT_SECRET=.*$/m,
    `JWT_SECRET=${jwtSecret}`
  );

  // Replace ANTHROPIC_API_KEY placeholder
  if (anthropicApiKey) {
    processed = processed.replace(
      /^# ANTHROPIC_API_KEY=.*$/m,
      `ANTHROPIC_API_KEY=${anthropicApiKey}`
    );
    processed = processed.replace(
      /^ANTHROPIC_API_KEY=.*$/m,
      `ANTHROPIC_API_KEY=${anthropicApiKey}`
    );
  } else {
    // Keep as comment with reminder
    processed = processed.replace(
      /^ANTHROPIC_API_KEY=.*$/m,
      "# ANTHROPIC_API_KEY=  # Add your API key from https://console.anthropic.com/"
    );
  }

  return processed;
}

/**
 * Main setup function
 */
async function main(): Promise<void> {
  try {
    // Show welcome banner
    showWelcomeBanner();

    console.log("   ⚡ Initializing development environment...\n");

    // Check if .env.example exists first
    if (!existsSync(envExamplePath)) {
      throw new Error(`.env.example file not found at ${envExamplePath}`);
    }

    // Check if .env already exists
    if (existsSync(envPath)) {
      console.log("✅ .env file already exists");
      process.exit(0);
    }

    // Generate JWT secret
    const jwtSecret = generateSecret();

    // Prompt for Anthropic API key (optional)
    const anthropicApiKey = await promptForAnthropicKey("Skipped Anthropic - add later by editing .env");

    // Create .env from template
    console.log("📋 Creating .env from .env.example...");

    const template = readFileSync(envExamplePath, "utf-8");
    const envContent = processEnvTemplate(template, jwtSecret, anthropicApiKey);

    writeFileSync(envPath, envContent);

    // Success message
    const items = [
      "Created .env file",
      "Generated JWT secret",
    ];

    if (anthropicApiKey) {
      items.push("Saved Anthropic API key");
    }

    const nextSteps = [
      "(Optional) Edit .env to add more API keys",
      "Run: pnpm dev",
    ];

    showSuccessBox("✓ Setup Complete!", items, nextSteps, {
      "Environment": ".env",
      "JWT Secret": "Generated securely",
      "API Keys": anthropicApiKey ? "Configured" : "Add to .env",
    });

  } catch (error) {
    showErrorBox(
      "✗ Setup Failed",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Run main function
main();
