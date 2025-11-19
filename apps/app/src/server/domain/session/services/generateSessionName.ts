import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { config } from "@/server/config";
import { AI_MODELS } from "@/shared/constants/ai";

/**
 * Options for generating a session name
 */
export interface GenerateSessionNameOptions {
  /** The initial user prompt/message to base the session name on */
  userPrompt: string;
}

/**
 * Generate a concise session name from the initial user prompt
 *
 * Uses AI to create a descriptive 3-5 word name that captures the main topic or task.
 * Falls back to "Untitled Session" if generation fails or API key is not set.
 *
 * @param options - Configuration object with userPrompt
 * @returns A 3-5 word descriptive session name
 *
 * @example
 * const name = await generateSessionName({
 *   userPrompt: "Help me fix a bug in the authentication flow"
 * });
 * // Returns: "Authentication Flow Bug Fix"
 */
export async function generateSessionName(
  options: GenerateSessionNameOptions
): Promise<string> {
  const { userPrompt } = options;

  const apiKey = config.apiKeys.anthropicApiKey;

  if (!apiKey) {
    // Silently return default - this is an optional feature
    return "Untitled Session";
  }

  if (!userPrompt || userPrompt.trim().length === 0) {
    return "Untitled Session";
  }

  try {
    // Truncate prompt to control token costs (keep first 200 chars)
    const truncatedPrompt = userPrompt.substring(0, 200);

    // Generate session name using AI
    const result = await generateText({
      model: anthropic(AI_MODELS.anthropic.HAIKU_3_5),
      system: `You create concise 3-5 word names for chat sessions. You MUST follow these rules strictly:

Rules:
1. Use EXACTLY 3-5 words (never more, never less)
2. Use Title Case (capitalize each word)
3. NO quotes, periods, or punctuation
4. Capture the main topic/task clearly
5. Be specific and descriptive

Examples:
- "Fix authentication bug" → "Auth Bug Fix"
- "Add dark mode toggle" → "Add Dark Mode Toggle"
- "Refactor user service to use dependency injection" → "Refactor User Service"
- "Help debug WebSocket connection" → "WebSocket Connection Debug"
- "Review my code" → "Code Review Session"

Response:
Your response must be ONLY the 3-5 word name, nothing else.`,
      prompt: `Create a 3-5 word name for this chat session:\n\n${truncatedPrompt}`,
      temperature: 0.7,
    });

    // Clean up the generated name
    const name = result.text.trim().replace(/['"]/g, "");

    return name || "Untitled Session";
  } catch {
    // Silently fall back to default on error - this is an optional feature
    return "Untitled Session";
  }
}
