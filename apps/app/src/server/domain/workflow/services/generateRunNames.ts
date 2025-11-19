import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { config } from "@/server/config";
import { MODELS } from "@/shared/constants/ai";

/**
 * Options for generating run names
 */
export interface GenerateRunNamesOptions {
  /** The spec file content to base names on */
  specContent: string;
}

/**
 * Result of name generation
 */
export interface GenerateRunNamesResult {
  /** 3-6 word descriptive run name in Title Case */
  runName: string;
  /** 2-4 word kebab-case git branch name */
  branchName: string;
}

/**
 * Generate run name and branch name from spec file content
 *
 * Uses AI to extract the main goal/feature from the spec and create:
 * - Run name: 3-6 words, Title Case, descriptive
 * - Branch name: 2-4 words, kebab-case, git-friendly
 *
 * Returns null if ANTHROPIC_API_KEY is not configured (silent fallback).
 *
 * @param options - Configuration object with specContent
 * @returns Generated names or null if API key not available
 *
 * @example
 * const result = await generateRunNames({
 *   specContent: "# Spec\n\nFix authentication flow bug..."
 * });
 * // Returns: {
 * //   runName: "Fix Auth Flow Bug",
 * //   branchName: "fix-auth-flow"
 * // }
 */
export async function generateRunNames(
  options: GenerateRunNamesOptions
): Promise<GenerateRunNamesResult | null> {
  const { specContent } = options;

  const apiKey = config.apiKeys.anthropicApiKey;

  if (!apiKey) {
    // Silently return null - this is an optional feature
    return null;
  }

  if (!specContent || specContent.trim().length === 0) {
    return null;
  }

  try {
    // Truncate spec content to control token costs (first 2000 chars)
    const truncatedSpec = specContent.substring(0, 2000);

    // Output schema for structured generation
    const schema = z.object({
      runName: z
        .string()
        .describe("3-6 word descriptive run name in Title Case"),
      branchName: z
        .string()
        .describe("2-4 word kebab-case git branch name (no special chars)"),
    });

    // Generate names using AI with structured output
    const result = await generateObject({
      model: anthropic(MODELS.anthropic.SONNET_4_5),
      system: `You analyze specification documents and create concise names for workflow runs and git branches.

Rules for run names:
1. Use EXACTLY 3-6 words
2. Use Title Case (capitalize each word)
3. Be descriptive and specific
4. Capture the main goal/feature
5. NO quotes, periods, or punctuation

Rules for branch names:
1. Use EXACTLY 2-4 words
2. Use kebab-case (lowercase with hyphens)
3. Match run name but shorter
4. Git-friendly (no special characters)
5. Common prefixes: feat/, fix/, refactor/, docs/, test/

Examples:
Spec: "Add dark mode toggle to settings"
→ Run: "Add Dark Mode Toggle"
→ Branch: "feat/dark-mode"

Spec: "Fix authentication bug in login flow"
→ Run: "Fix Auth Login Bug"
→ Branch: "fix/auth-login"

Spec: "Refactor user service to use dependency injection"
→ Run: "Refactor User Service DI"
→ Branch: "refactor/user-service"

Extract the core feature/goal and generate appropriate names.`,
      prompt: `Generate run and branch names for this specification:\n\n${truncatedSpec}`,
      schema,
      temperature: 0.7,
    });

    return {
      runName: result.object.runName,
      branchName: result.object.branchName,
    };
  } catch {
    // Silently fall back to null on error - this is an optional feature
    return null;
  }
}
