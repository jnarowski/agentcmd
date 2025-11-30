import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { useSessionFile } from "../hooks/useSessionFile";
import { useCopy } from "@/client/hooks/useCopy";

interface SessionFileViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

/**
 * Modal dialog that displays raw JSONL session file content
 * Used for debugging and inspecting session data
 */
export function SessionFileViewer({
  open,
  onOpenChange,
  sessionId,
}: SessionFileViewerProps) {
  const { copied, copy } = useCopy();
  const { copy: copyPath } = useCopy();

  // Fetch session file content
  const { data, isLoading, error } = useSessionFile(sessionId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Session File</DialogTitle>
          <DialogDescription>
            Raw JSONL file content for debugging
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* File path with copy button */}
          {data?.path && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-xs font-mono break-all">
              <span className="flex-1 truncate" title={data.path}>
                {data.path}
              </span>
              <button
                onClick={() => data?.path && copyPath(data.path)}
                className="shrink-0 p-1 hover:bg-background rounded transition-colors"
                title="Copy path"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Content display */}
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Content</span>
              <button
                onClick={() => data?.content && copy(data.content)}
                disabled={!data?.content || isLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-auto border rounded-md bg-muted/30">
              {isLoading && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading...
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center h-full text-destructive p-4 text-center">
                  <div>
                    <p className="font-semibold mb-2">Error loading file</p>
                    <p className="text-sm">
                      {error instanceof Error
                        ? error.message
                        : "Unknown error occurred"}
                    </p>
                  </div>
                </div>
              )}

              {data?.content && (
                <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words">
                  {data.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
