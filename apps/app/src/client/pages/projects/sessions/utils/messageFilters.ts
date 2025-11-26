import type { UIMessage } from "@/shared/types/message.types";

/**
 * Check if a message will have renderable content after component filtering.
 * Mirrors the filtering logic in UserMessage and AssistantMessage components.
 *
 * This prevents blank rows during streaming when tool_result-only messages arrive
 * before enrichment/finalization filters them out.
 */
export function shouldRenderMessage(message: UIMessage): boolean {
  // Reject messages with no content or non-array content
  if (!Array.isArray(message.content) || message.content.length === 0) {
    return false;
  }

  // Apply same filtering logic as UserMessage/AssistantMessage components
  const renderableBlocks = message.content.filter((block) => {
    // Skip string blocks (edge case, shouldn't happen)
    if (typeof block === 'string') {
      return false;
    }

    // Filter out tool_result blocks (UserMessage filters these)
    // Tool results are shown inline with tool_use after enrichment
    if (block.type === 'tool_result') {
      return false;
    }

    // Filter out empty text blocks (both components filter these)
    if (block.type === 'text') {
      return block.text && block.text.trim() !== '';
    }

    // Keep all other blocks (tool_use, thinking, image, etc.)
    return true;
  });

  // Only render if at least one block will be visible
  return renderableBlocks.length > 0;
}
