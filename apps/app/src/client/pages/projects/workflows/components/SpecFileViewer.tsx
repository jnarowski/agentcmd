import { useState, useEffect, useCallback } from "react";
import { X, Save, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { CodeEditor } from "@/client/components/CodeEditor";
import { api } from "@/client/utils/api";

interface SpecFileViewerProps {
  projectId: string;
  specPath: string;
  specName: string;
  onClose: () => void;
}

export function SpecFileViewer({
  projectId,
  specPath,
  specName,
  onClose,
}: SpecFileViewerProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [wordWrap, setWordWrap] = useState(true); // Default to true for markdown

  // Load spec content
  useEffect(() => {
    const loadSpecContent = async () => {
      try {
        setLoading(true);
        const data = await api.get<{ content: string }>(
          `/api/projects/${projectId}/specs/content?specPath=${encodeURIComponent(specPath)}`
        );
        setContent(data.content);
      } catch (error) {
        console.error("Error loading spec:", error);
        setContent(
          `# Error Loading Spec\n\n${error instanceof Error ? error.message : "Unknown error"}\n\n**Spec:** ${specName}\n**Path:** ${specPath}`
        );
      } finally {
        setLoading(false);
      }
    };

    loadSpecContent();
  }, [projectId, specPath, specName]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await api.post(`/api/projects/${projectId}/specs/content`, {
        specPath,
        content,
      });

      // Show success feedback
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Error saving spec:", error);
      alert(
        `Error saving spec: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setSaving(false);
    }
  }, [projectId, specPath, content]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "s") {
          e.preventDefault();
          handleSave();
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handleSave]);

  if (loading) {
    return (
      <div
        className={`fixed inset-0 z-50 ${isFullscreen ? "" : "md:bg-black/80 md:flex md:items-center md:justify-center"}`}
      >
        <div className="w-full h-full md:rounded-lg md:w-auto md:h-auto p-8 flex items-center justify-center bg-background border border-border/50">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Loading {specName}...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-50 ${
        isFullscreen
          ? ""
          : "md:bg-black/80 md:flex md:items-center md:justify-center md:p-4"
      }`}
    >
      <div
        className={`bg-background shadow-2xl flex flex-col border border-border/50 ${
          isFullscreen
            ? "w-full h-full"
            : "w-full h-full md:rounded-lg md:shadow-2xl md:w-full md:max-w-6xl md:h-[80vh] md:max-h-[80vh]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground text-sm font-mono font-bold">
                MD
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-medium truncate">{specName}</h3>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {specPath}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWordWrap(!wordWrap)}
              className={wordWrap ? "bg-secondary" : ""}
              title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
            >
              <span className="text-sm md:text-xs font-mono font-bold">↵</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className={
                saveSuccess ? "bg-green-600 hover:bg-green-700" : ""
              }
            >
              {saveSuccess ? (
                <>
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="hidden sm:inline">Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">
                    {saving ? "Saving..." : "Save"}
                  </span>
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="hidden md:flex"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto">
          <CodeEditor
            value={content}
            onChange={setContent}
            language="markdown"
            height="100%"
            showLineNumbers={true}
            wordWrap={wordWrap}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t bg-secondary/30 flex-shrink-0">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Lines: {content.split("\n").length}</span>
            <span>Characters: {content.length}</span>
            <span>Language: Markdown</span>
          </div>

          <div className="text-sm text-muted-foreground hidden md:block">
            Press Cmd/Ctrl+S to save • Esc to close
          </div>
        </div>
      </div>
    </div>
  );
}
