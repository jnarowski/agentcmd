/**
 * Message Utilities
 * Shared utilities for message processing used by both client and server
 */

/**
 * Checks if a text content string is a system message that should be filtered
 *
 * System messages include:
 * - Command tags: <command-name>, <command-message>, <command-args>, <local-command-stdout>
 * - System reminders: <system-reminder>
 * - Session continuity messages: "This session is being continued from a previous"
 * - Caveats: "Caveat:" (any message starting with "Caveat:")
 * - API errors: "Invalid API key"
 * - Task Master prompts: JSON with "subtasks" or "CRITICAL: You MUST respond with ONLY a JSON"
 * - Warmup messages: exactly "Warmup"
 * - Ready messages: "I'm ready to help! I'm Claude Code..."
 *
 * @param textContent - The text content to check
 * @returns true if the content is a system message that should be filtered
 */
export function isSystemMessage(textContent: string): boolean {
  if (typeof textContent !== "string") {
    return false;
  }

  // Check for various system message patterns
  const isSystemPattern =
    textContent.startsWith("<command-name>") ||
    textContent.startsWith("<command-message>") ||
    textContent.startsWith("<command-args>") ||
    textContent.startsWith("<local-command-stdout>") ||
    textContent.startsWith("<system-reminder>") ||
    textContent.startsWith("Caveat:") ||
    textContent.startsWith("This session is being continued from a previous") ||
    textContent.includes("Invalid API key") ||
    textContent.includes('{"subtasks":') ||
    textContent.includes("CRITICAL: You MUST respond with ONLY a JSON") ||
    textContent === "Warmup" ||
    textContent.startsWith(
      "I'm ready to help! I'm Claude Code, Anthropic's official CLI for Claude"
    );

  return isSystemPattern;
}

/**
 * Strips XML-like tags from text content for display purposes
 *
 * Removes:
 * - XML-like tags: <tag_name>, <...>, </tag_name>
 * - <system-reminder> blocks with their content
 *
 * @param text - The text content to clean
 * @returns Cleaned text with XML tags removed
 */
export function stripXmlTags(text: string): string {
  if (typeof text !== "string") {
    return "";
  }

  // Remove <system-reminder> blocks with their content
  let cleaned = text.replace(
    /<system-reminder>[\s\S]*?<\/system-reminder>/gi,
    ""
  );

  // Remove all XML-like tags (opening, closing, and self-closing)
  cleaned = cleaned.replace(/<[^>]+>/g, "");

  // Collapse multiple spaces into single space and trim
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}
