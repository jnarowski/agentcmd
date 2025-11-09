import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useProjectsWithSessions,
  useProjectReadme,
} from "@/client/pages/projects/hooks/useProjects";
import { NewSessionButton } from "@/client/pages/projects/sessions/components/NewSessionButton";
import { ProjectDialog } from "@/client/pages/projects/components/ProjectDialog";
import { ProjectOnboardingSuggestions } from "@/client/pages/projects/components/ProjectOnboardingSuggestions";
import { ProjectHomeSessions } from "@/client/pages/projects/components/ProjectHomeSessions";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { MessageSquare, FileText, Pencil, FolderOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";
import { truncatePath } from "@/client/utils/cn";

export default function ProjectHome() {
  const { id } = useParams<{ id: string }>();
  const { data: projectsData, isLoading } = useProjectsWithSessions();
  const project = projectsData?.find((p) => p.id === id);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useDocumentTitle(
    project?.name ? `${project.name} | Agent Workflows` : undefined
  );
  const sessions = project?.sessions || [];
  const {
    data: readme,
    isLoading: isLoadingReadme,
    error: readmeError,
  } = useProjectReadme(id!);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold leading-tight break-words">
              {project.name}
            </h1>
          </div>
          <div className="flex items-stretch gap-1 shrink-0">
            <NewSessionButton
              projectId={id!}
              variant="outline"
              size="sm"
              className="[&>button]:h-full [&]:h-auto"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              className="self-stretch"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Project Setup */}
      {!project.capabilities.workflow_sdk.installed && (
        <ProjectOnboardingSuggestions project={project} />
      )}

      {/* Sessions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <MessageSquare className="h-5 w-5 shrink-0" />
            <span className="truncate">Sessions</span>
          </CardTitle>
          <CardDescription className="mt-1.5 text-xs md:text-sm">
            Manage and filter your chat sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ProjectHomeSessions sessions={sessions} projectId={id!} />
        </CardContent>
      </Card>

      {/* README Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <FileText className="h-5 w-5 shrink-0" />
            <span className="truncate">Project README</span>
          </CardTitle>
          {readme?.path && project && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CardDescription className="font-mono text-xs cursor-help break-all">
                    {truncatePath(
                      `${project.path}/${readme.path}`,
                      typeof window !== "undefined" && window.innerWidth < 768
                        ? 35
                        : 70
                    )}
                  </CardDescription>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-md break-all">
                  <p className="font-mono text-xs">
                    {project.path}/{readme.path}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingReadme ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : readmeError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No README.md found in this project.
              </p>
            </div>
          ) : readme ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {readme.content}
              </ReactMarkdown>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
      />
    </div>
  );
}
