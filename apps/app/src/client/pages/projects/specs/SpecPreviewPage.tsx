import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Save, Play, ChevronDown, FolderOpen, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/client/components/PageHeader";
import { MarkdownPreview } from "@/client/pages/projects/workflows/components/MarkdownPreview";
import { CodeEditor } from "@/client/components/CodeEditor";
import { Tabs, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { Button } from "@/client/components/ui/button";
import { ButtonGroup } from "@/client/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { SpecStatusBadge } from "./components/SpecStatusBadge";
import { SpecPreviewSkeleton } from "./components/SpecPreviewSkeleton";
import type { SpecStatus } from "./components/SpecStatusBadge";
import { useSpecContent } from "./hooks/useSpecContent";
import { useSpecs } from "@/client/hooks/useSpecs";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { useProjectId } from "@/client/hooks/useProjectId";
import { api } from "@/client/utils/api";

type ViewMode = "preview" | "edit";

export default function SpecPreviewPage() {
  const projectId = useProjectId();
  const { specId } = useParams<{ specId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Get initial mode from URL
  const initialMode = searchParams.get("mode") === "edit" ? "edit" : "preview";

  // State
  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch data
  const { data: project } = useProject(projectId);
  const { data: specsData } = useSpecs(projectId);
  const spec = specsData?.specs.find((s) => s.id === specId);

  // Fetch content
  const {
    data: specContent,
    isLoading: contentLoading,
    error: contentError,
  } = useSpecContent(projectId, spec?.specPath || null);

  // Initialize content when loaded
  useEffect(() => {
    if (specContent) {
      setContent(specContent);
    }
  }, [specContent]);

  // Redirect if spec not found
  useEffect(() => {
    if (!spec && specsData) {
      toast.error("Spec not found");
      navigate(`/projects/${projectId}`, { replace: true });
    }
  }, [spec, specsData, navigate, projectId]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!spec) return;

    setSaving(true);
    try {
      await api.post(`/api/projects/${projectId}/specs/content`, {
        specPath: spec.specPath,
        content,
      });

      // Invalidate content cache
      queryClient.invalidateQueries({
        queryKey: ["spec-content", projectId, spec.specPath],
      });

      toast.success("Spec saved successfully");
      setViewMode("preview");
    } catch (error) {
      console.error("Error saving spec:", error);
      toast.error(
        `Failed to save spec: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setSaving(false);
    }
  }, [spec, projectId, content, queryClient]);

  // Create workflow handler
  const handleCreateWorkflowRun = useCallback(() => {
    if (!spec) return;
    navigate(`/projects/${projectId}/workflows/new?specFile=${encodeURIComponent(spec.specPath)}`);
  }, [spec, projectId, navigate]);

  // New followup session handler
  const handleNewFollowupSession = useCallback(() => {
    if (!spec) return;
    const message = `Read @${spec.specPath} and related context.`;
    navigate(`/projects/${projectId}/sessions/new?initialMessage=${encodeURIComponent(message)}`);
  }, [spec, projectId, navigate]);

  // Move spec handler
  const handleMove = useCallback(
    async (targetFolder: "todo" | "done" | "backlog") => {
      if (!spec) return;

      try {
        await api.post(`/api/projects/${projectId}/specs/${spec.id}/move`, {
          targetFolder,
        });

        // Invalidate specs cache
        queryClient.invalidateQueries({ queryKey: ["specs", projectId] });

        toast.success(`Spec moved to ${targetFolder}`);
      } catch (error) {
        console.error("Error moving spec:", error);
        toast.error(
          `Failed to move spec: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },
    [spec, projectId, queryClient]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && viewMode === "edit") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape" && viewMode === "edit") {
        setViewMode("preview");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, handleSave]);

  // Show skeleton while loading specs list or content
  if (!specsData || contentLoading) {
    return <SpecPreviewSkeleton />;
  }

  if (!spec) {
    return null; // Will redirect
  }

  // Error state - spec file might be missing
  if (contentError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold">Failed to load spec content</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            The spec file may have been deleted or moved. Try rescanning specs from the project page.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/projects/${projectId}`)}>
          Back to Project
        </Button>
      </div>
    );
  }

  // Format dates
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Page Header */}
      <PageHeader
        title={spec.name}
        description={`Created ${formatDate(spec.created_at)}`}
        breadcrumbs={[
          { label: project?.name || "Project", href: `/projects/${projectId}` },
          { label: "Specs", href: `/projects/${projectId}` },
          { label: spec.name },
        ]}
        afterTitle={
          <SpecStatusBadge status={spec.status as SpecStatus} size="sm" />
        }
        actions={
          <ButtonGroup>
            <Button
              variant="outline"
              onClick={handleCreateWorkflowRun}
              aria-label="Implement this spec"
            >
              <Play className="h-4 w-4" />
              Implement
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleNewFollowupSession}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  New Followup Session
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Move to...
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleMove("todo")}>
                      Todo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMove("done")}>
                      Done
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMove("backlog")}>
                      Backlog
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
        }
      />

      {/* Split-pane Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
        {/* Main Content Area */}
        <div className="md:col-span-2 flex flex-col overflow-hidden border-r">
          {/* Tab Group Header */}
          <div className="border-b px-6 py-3 flex items-center justify-between">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
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
          <div className="flex-1 overflow-y-auto">
            {viewMode === "preview" ? (
              <div className="p-6 pt-3">
                <MarkdownPreview content={content} hideFirstH1 />
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
        </div>

        {/* Sidebar */}
        <div className="hidden md:flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Details Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Details</h3>
              <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <SpecStatusBadge
                    status={spec.status as SpecStatus}
                    size="sm"
                  />
                </dd>

                <dt className="text-muted-foreground">Type</dt>
                <dd className="capitalize">{spec.spec_type || "feature"}</dd>

                {spec.totalComplexity !== undefined && (
                  <>
                    <dt className="text-muted-foreground">Complexity</dt>
                    <dd>{spec.totalComplexity} points</dd>
                  </>
                )}

                {spec.created_at && (
                  <>
                    <dt className="text-muted-foreground">Created</dt>
                    <dd>{formatDate(spec.created_at)}</dd>
                  </>
                )}
              </dl>
            </div>

            {/* Phases Section */}
            {spec.phaseCount !== undefined && spec.phaseCount > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Phases</h3>
                <div className="text-sm text-muted-foreground">
                  {spec.phaseCount} phase{spec.phaseCount !== 1 ? "s" : ""}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            {spec.taskCount !== undefined && spec.taskCount > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Tasks</h3>
                <div className="text-sm text-muted-foreground">
                  {spec.taskCount} task{spec.taskCount !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
