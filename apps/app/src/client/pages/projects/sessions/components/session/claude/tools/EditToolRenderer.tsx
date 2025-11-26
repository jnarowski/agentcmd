/**
 * Renderer for Edit tool input
 * Shows file path and diff view
 */

import type { EditToolInput } from "@/shared/types/tool.types";
import { FileReference } from "@/client/pages/projects/sessions/components/FileReference";
import { DiffViewer } from "@/client/components/DiffViewer";
import { useCodeBlockTheme } from "@/client/utils/codeBlockTheme";

interface EditToolRendererProps {
  input: EditToolInput;
}

export function EditToolRenderer({ input }: EditToolRendererProps) {
  const { colors } = useCodeBlockTheme();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">File:</span>
        <FileReference filePath={input.file_path} />
        {input.replace_all && (
          <span className="text-xs text-muted-foreground">(replace all)</span>
        )}
      </div>
      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: colors.border }}
      >
        <DiffViewer
          oldString={input.old_string}
          newString={input.new_string}
          filePath={input.file_path}
        />
      </div>
    </div>
  );
}
