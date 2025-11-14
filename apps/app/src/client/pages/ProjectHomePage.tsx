import { useParams } from "react-router-dom";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { useSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import { AppHeader } from "@/client/components/AppHeader";
import { ProjectOnboardingSuggestions } from "@/client/pages/projects/components/ProjectOnboardingSuggestions";
import { ProjectHomeSessions } from "@/client/pages/projects/components/ProjectHomeSessions";
import { ProjectReadme } from "@/client/pages/projects/components/ProjectReadme";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { MessageSquare } from "lucide-react";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";

export default function ProjectHomePage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id!);
  const { data: sessions = [] } = useSessions({ projectId: id });

  useDocumentTitle(
    project?.name ? `${project.name} | Agent Workflows` : undefined
  );

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
    <>
      <AppHeader title={project.name} />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Desktop header */}
        <div className="hidden md:block">
          <h1 className="text-xl md:text-2xl font-semibold leading-tight break-words">
            {project.name}
          </h1>
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
        </CardHeader>
        <CardContent className="pt-0">
          <ProjectHomeSessions sessions={sessions} projectId={id!} />
        </CardContent>
      </Card>

      {/* README Section */}
      <ProjectReadme project={project} />
      </div>
    </>
  );
}
