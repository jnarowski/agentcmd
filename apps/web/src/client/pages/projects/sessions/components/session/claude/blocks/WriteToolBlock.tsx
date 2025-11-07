/**
 * Write tool block component
 */

import { useState } from "react";
import { ToolCollapsibleWrapper } from "@/client/pages/projects/sessions/components/session/claude/ToolCollapsibleWrapper";
import { SyntaxHighlighter } from "@/client/utils/syntaxHighlighter";
import { getLanguageFromPath } from "@/client/utils/getLanguageFromPath";
import { useCodeBlockTheme } from "@/client/utils/codeBlockTheme";
import { ExpandButton } from "@/client/pages/projects/sessions/components/session/claude/blocks/ExpandButton";
import type { WriteToolInput } from "@/shared/types/tool.types";
import type { UnifiedImageBlock } from '@repo/agent-cli-sdk';

interface WriteToolBlockProps {
  input: WriteToolInput;
  result?: {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  };
}

const MAX_LINES_PREVIEW = 20;

export function WriteToolBlock({ input, result }: WriteToolBlockProps) {
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
      return "Write failed";
    }
    return "File created";
  };

  const language = getLanguageFromPath(input.file_path);

  // Calculate total lines for truncation
  const totalLines = input.content.split("\n").length;
  const shouldTruncate = totalLines > MAX_LINES_PREVIEW;

  return (
    <ToolCollapsibleWrapper
      toolName="Write"
      contextInfo={getFileName(input.file_path)}
      description={getDescription()}
      hasError={result?.is_error}
      defaultOpen={true}
    >
      {/* Content preview */}
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
          className="text-xs [&_pre]:!m-0 [&_pre]:!p-3 [&_code]:!block"
          style={{
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <SyntaxHighlighter
            code={input.content}
            language={language}
            showLineNumbers={false}
          />
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
    </ToolCollapsibleWrapper>
  );
}
