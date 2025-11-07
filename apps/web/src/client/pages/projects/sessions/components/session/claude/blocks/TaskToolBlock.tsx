/**
 * Task tool block component
 */

import { useState } from "react";
import { ToolCollapsibleWrapper } from "@/client/pages/projects/sessions/components/session/claude/ToolCollapsibleWrapper";
import { useCodeBlockTheme } from "@/client/utils/codeBlockTheme";
import { ExpandButton } from "@/client/pages/projects/sessions/components/session/claude/blocks/ExpandButton";
import type { TaskToolInput } from "@/shared/types/tool.types";
import type { UnifiedImageBlock } from 'agent-cli-sdk';

interface TaskToolBlockProps {
  input: TaskToolInput;
  result?: {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  };
}

const MAX_LINES_PREVIEW = 20;

export function TaskToolBlock({ input, result }: TaskToolBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useCodeBlockTheme();

  // Create description based on result or status
  const getDescription = (): string => {
    if (result?.is_error) {
      return "Task failed";
    }
    if (result) {
      return "Task completed";
    }
    return input.description || "Running task";
  };

  // Calculate total lines for truncation
  const totalLines = input.prompt ? input.prompt.split("\n").length : 0;
  const shouldTruncate = totalLines > MAX_LINES_PREVIEW;

  // Create context info with subagent type
  const contextInfo = input.subagent_type || null;

  return (
    <ToolCollapsibleWrapper
      toolName="Task"
      contextInfo={contextInfo}
      description={getDescription()}
      hasError={result?.is_error}
      defaultOpen={false}
    >
      {/* Prompt preview */}
      {input.prompt && (
        <div
          className={`relative rounded-lg border overflow-hidden ${
            shouldTruncate && !isExpanded ? "max-h-40" : ""
          }`}
          style={{
            borderColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <div
            className="text-xs p-3 text-foreground"
            style={{
              fontFamily: "ui-monospace, monospace",
            }}
          >
            <pre className="whitespace-pre-wrap break-words m-0">
              {input.prompt}
            </pre>
          </div>

          {/* Fade gradient overlay */}
          {shouldTruncate && !isExpanded && (
            <>
              <div
                className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
                style={{
                  background: `linear-gradient(to top, ${colors.background} 0%, transparent 100%)`,
                }}
              />
              <ExpandButton onClick={() => setIsExpanded(true)} />
            </>
          )}
        </div>
      )}
    </ToolCollapsibleWrapper>
  );
}
