import { useNavigate } from "react-router-dom";
import { useProjectsWithSessions, useSyncProjects } from "@/client/pages/projects/hooks/useProjects";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/client/components/ui/empty";
import { FolderOpen, Plus, Calendar, FolderGit2, Loader2 } from "lucide-react";
import { useState } from "react";
import { ProjectDialog } from "@/client/pages/projects/components/ProjectDialog";
import { GlobalOnboardingSuggestions } from "@/client/pages/projects/components/GlobalOnboardingSuggestions";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";
import { truncatePath } from "@/client/utils/cn";

export default function Projects() {
  useDocumentTitle("Projects | Agent Workflows");
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjectsWithSessions();
  const { isLoading: isSyncing } = useSyncProjects();
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
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

      {/* Projects Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
                {project.is_hidden && (
                  <Badge variant="outline" className="text-xs">
                    Hidden
                  </Badge>
                )}
              </div>
              <CardTitle className="mt-3">{project.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {new Date(project.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="mt-2 text-xs text-muted-foreground font-mono truncate cursor-help">
                      {truncatePath(
                        project.path,
                        typeof window !== "undefined" && window.innerWidth < 768
                          ? 30
                          : 50
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-md break-all">
                    <p className="font-mono text-xs">{project.path}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
