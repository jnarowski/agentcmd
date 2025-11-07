/**
 * Read tool block component
 */

import { ToolCollapsibleWrapper } from "@/client/pages/projects/sessions/components/session/claude/ToolCollapsibleWrapper";
import { ImageBlock } from "@/client/pages/projects/sessions/components/session/claude/ImageBlock";
import type { ReadToolInput } from "@/shared/types/tool.types";
import type { UnifiedImageBlock } from "@repo/agent-cli-sdk";

interface ReadToolBlockProps {
  input: ReadToolInput;
  result?: {
    content: string | UnifiedImageBlock;
    is_error?: boolean;
  };
}

export function ReadToolBlock({ input, result }: ReadToolBlockProps) {
  // Extract filename from path
  const getFileName = (filePath: string): string => {
    const parts = filePath.split("/");
    return parts[parts.length - 1];
  };

  // Create context info with filename and line numbers
  const getContextInfo = (): string => {
    const filename = getFileName(input.file_path);
    if (input.offset !== undefined && input.limit !== undefined) {
      const startLine = input.offset + 1;
      const endLine = input.offset + input.limit;
      return `${filename} (lines ${startLine}-${endLine})`;
    }
    return filename;
  };

  // Check if result content is an image
  const isImageContent = (content: string | UnifiedImageBlock): content is UnifiedImageBlock => {
    return typeof content === 'object' && content.type === 'image';
  };

  // Check if there's any content to show
  const hasContent = result && (
    (result.is_error && typeof result.content === 'string' && result.content.trim()) ||
    (!result.is_error && result.content)
  );

  return (
    <ToolCollapsibleWrapper
      toolName="Read"
      contextInfo={getContextInfo()}
      description={null}
      hasError={result?.is_error}
    >
      {hasContent && (
        <>
          {/* Error content */}
          {result.is_error && typeof result.content === 'string' && (
            <div className="text-sm text-red-500">{result.content}</div>
          )}

          {/* Image content */}
          {!result.is_error && result.content && isImageContent(result.content) && (
            <div className="mt-2">
              <ImageBlock image={result.content} alt={getFileName(input.file_path)} />
            </div>
          )}

          {/* Text content - shown in collapsible but hidden by default since file contents can be large */}
          {!result.is_error && result.content && typeof result.content === 'string' && result.content.trim() && (
            <div className="text-xs text-muted-foreground">
              File read successfully
            </div>
          )}
        </>
      )}
    </ToolCollapsibleWrapper>
  );
}
