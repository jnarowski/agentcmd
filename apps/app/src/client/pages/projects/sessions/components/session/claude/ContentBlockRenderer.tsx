/**
 * Router for content block renderers
 * Dispatches to appropriate renderer based on block type
 */

import type {
  UnifiedContent,
  EnrichedToolUseBlock,
} from "@/shared/types/message.types";
import { TextBlock } from "./TextBlock";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolBlockRenderer } from "./ToolBlockRenderer";
import { SlashCommandBlock } from "./blocks/SlashCommandBlock";

interface ContentBlockRendererProps {
  block: UnifiedContent;
  className?: string;
  onApprove?: (toolUseId: string) => void;
  showDot?: boolean;
}

export function ContentBlockRenderer({
  block,
  className = "",
  onApprove,
  showDot = true,
}: ContentBlockRendererProps) {
  switch (block.type) {
    case "text": {
      // DEBUG: Check for empty text blocks
      if (!block.text || block.text.trim() === "") {
        console.warn(
          "[ContentBlockRenderer] EMPTY TEXT BLOCK DETECTED:",
          block
        );

        return null;
      }

      return <TextBlock text={block.text} className={className} showDot={showDot} />;
    }

    case "thinking":
      return <ThinkingBlock thinking={block.thinking} className={className} />;

    case "tool_use": {
      // Access result directly from enriched block
      const enrichedBlock = block as EnrichedToolUseBlock;

      return (
        <ToolBlockRenderer
          toolName={block.name}
          toolUseId={block.id}
          input={block.input}
          result={enrichedBlock.result}
          onApprove={onApprove}
        />
      );
    }

    case "slash_command":
      return (
        <SlashCommandBlock
          command={block.command}
          message={block.message}
          args={block.args}
        />
      );

    case "tool_result":
      // Tool results are handled inline with tool_use blocks
      // We don't render them separately
      return null;

    default: {
      // Unknown block type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.warn("Unknown content block type:", (block as any).type, block);
      return (
        <div className="text-sm text-muted-foreground italic">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          Unknown content block type: {(block as any).type}
        </div>
      );
    }
  }
}
