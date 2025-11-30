import { useState, useEffect, useCallback } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { Button } from "@/client/components/ui/button";
import { MarkdownPreview } from "@/client/pages/projects/workflows/components/MarkdownPreview";
import { CodeEditor } from "@/client/components/CodeEditor";
import { useSpecContent } from "../hooks/useSpecContent";
import { api } from "@/client/utils/api";

type ViewMode = "preview" | "edit";

interface SpecPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  specPath: string;
  specName: string;
  initialMode?: ViewMode;
}

export function SpecPreviewModal({
  open,
  onOpenChange,
  projectId,
  specPath,
  specName,
  initialMode = "preview",
}: SpecPreviewModalProps) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch content
  const {
    data: specContent,
    isLoading: contentLoading,
    error: contentError,
  } = useSpecContent(projectId, open ? specPath : null);

  // Initialize content when loaded
  useEffect(() => {
    if (specContent) {
      setContent(specContent);
    }
  }, [specContent]);

  // Reset mode when modal opens
  useEffect(() => {
    if (open) {
      setViewMode(initialMode);
    }
  }, [open, initialMode]);

  // Save handler
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await api.post(`/api/projects/${projectId}/specs/content`, {
        specPath,
        content,
      });

      // Invalidate content cache
      queryClient.invalidateQueries({
        queryKey: ["spec-content", projectId, specPath],
      });

      toast.success("Spec saved successfully");
      setViewMode("preview");
    } catch (error) {
      toast.error(
        `Failed to save spec: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setSaving(false);
    }
  }, [projectId, specPath, content, queryClient]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && viewMode === "edit") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape" && viewMode === "edit") {
        e.preventDefault();
        setViewMode("preview");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, viewMode, handleSave]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{specName}</DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        <div className="border-b px-6 py-3 flex items-center justify-between shrink-0">
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as ViewMode)}
          >
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="edit">Edit</TabsTrigger>
            </TabsList>
          </Tabs>
          {viewMode === "edit" && (
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
              aria-label="Save spec"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {contentLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-sm text-muted-foreground">
                Loading spec...
              </div>
            </div>
          ) : contentError ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-sm text-destructive">
                Failed to load spec content
              </div>
            </div>
          ) : viewMode === "preview" ? (
            <div className="p-6">
              <MarkdownPreview content={content} />
            </div>
          ) : (
            <CodeEditor
              value={content}
              onChange={setContent}
              language="markdown"
              height="100%"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
