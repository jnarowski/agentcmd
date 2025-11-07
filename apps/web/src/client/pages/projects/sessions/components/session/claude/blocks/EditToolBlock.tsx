/**
 * Edit tool block component
 */

import { useState } from "react";
import { ToolCollapsibleWrapper } from "@/client/pages/projects/sessions/components/session/claude/ToolCollapsibleWrapper";
import { DiffViewer } from "@/client/components/DiffViewer";
import { useCodeBlockTheme } from "@/client/utils/codeBlockTheme";
import { ExpandButton } from "@/client/pages/projects/sessions/components/session/claude/blocks/ExpandButton";
import type { EditToolInput } from "@/shared/types/tool.types";
import type { UnifiedImageBlock } from 'agent-cli-sdk';

interface EditToolBlockProps {
  input: EditToolInput;
  result?: {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  };
}

const MAX_LINES_PREVIEW = 6;

export function EditToolBlock({ input, result }: EditToolBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useCodeBlockTheme();

  // Extract filename from path
  const getFileName = (filePath: string): string => {
    const parts = filePath.split("/");
    return parts[parts.length - 1];
  };

  // Create description based on result
  const getDescription = (): string => {
    if (result?.is_error) {
      return "Edit failed";
    }
    return "Edit succeeded";
  };

  // Calculate total lines for truncation (approximate using max of old/new line counts)
  const oldLines = input.old_string.split("\n").length;
  const newLines = input.new_string.split("\n").length;
  const totalLines = Math.max(oldLines, newLines);

  const shouldTruncate = totalLines > MAX_LINES_PREVIEW;

  return (
    <ToolCollapsibleWrapper
      toolName="Edit"
      contextInfo={getFileName(input.file_path)}
      description={getDescription()}
      hasError={result?.is_error}
      defaultOpen={true}
    >
      {/* Inline diff */}
      <div
        className={`relative rounded-lg border overflow-hidden ${
          shouldTruncate && !isExpanded ? "max-h-40" : ""
        }`}
        style={{
          borderColor: colors.border,
        }}
      >
        <DiffViewer
          oldString={input.old_string}
          newString={input.new_string}
          filePath={input.file_path}
          className="border-0"
        />

        {/* Fade gradient overlay */}
        {shouldTruncate && !isExpanded && (
          <>
            <div
              className="absolute inset-x-0 bottom-0 h-10 pointer-events-none"
              style={{
                background: `linear-gradient(to top, ${colors.background} 0%, transparent 100%)`,
              }}
            />
            <ExpandButton onClick={() => setIsExpanded(true)} />
          </>
        )}
      </div>
    </ToolCollapsibleWrapper>
  );
}
