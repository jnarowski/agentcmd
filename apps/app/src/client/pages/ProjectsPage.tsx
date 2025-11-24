import { useProjects } from "@/client/pages/projects/hooks/useProjects";
import { useProjectsStore } from "@/client/stores/useProjectsStore";
import { AppHeader } from "@/client/components/AppHeader";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Button } from "@/client/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/client/components/ui/empty";
import { Plus, FolderGit2, Loader2 } from "lucide-react";
import { useState } from "react";
import { ProjectDialog } from "@/client/pages/projects/components/ProjectDialog";
import { GlobalOnboardingSuggestions } from "@/client/pages/projects/components/GlobalOnboardingSuggestions";
import { ProjectsList } from "@/client/pages/projects/components/ProjectsList";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";

export default function ProjectsPage() {
  useDocumentTitle("Projects | Agent Workflows");
  const { data: projects, isLoading } = useProjects();
  const isSyncing = useProjectsStore((state) => state.isSyncing);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  // Empty state - syncing projects from Claude CLI
  if (isSyncing && (!projects || projects.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Loader2 className="animate-spin" />
            </EmptyMedia>
            <EmptyTitle>Importing Projects</EmptyTitle>
            <EmptyDescription>
              Syncing your projects from Claude CLI. This will only take a moment...
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  // Empty state - no projects
  if (!projects || projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderGit2 />
            </EmptyMedia>
            <EmptyTitle>No Projects Yet</EmptyTitle>
            <EmptyDescription>
              Get started by creating your first project. Projects help you
              organize your AI workflows, chat sessions, and files in one place.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Project
            </Button>
          </EmptyContent>
        </Empty>
        <ProjectDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />
      </div>
    );
  }

  // Projects list
  return (
    <>
      <AppHeader title="Projects" />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="hidden md:block">
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage and organize your AI workflow projects
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

      {/* Global Setup Suggestions */}
      <GlobalOnboardingSuggestions />

      {/* Projects List */}
      <ProjectsList projects={projects} />

      <ProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      </div>
    </>
  );
}
