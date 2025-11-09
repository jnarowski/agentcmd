import { useEffect } from 'react';
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { useActiveSession } from "@/client/hooks/navigation/useActiveSession";
import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { useNavigationStore } from "@/client/stores/index";
import { ProjectHeader } from "@/client/components/ProjectHeader";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";
import type { SessionResponse } from "@/shared/types/agent-session.types";

export default function ProjectDetailLayout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveProject = useNavigationStore((state) => state.setActiveProject);
  const clearNavigation = useNavigationStore((state) => state.clearNavigation);
  const { data: project, isLoading, error } = useProject(id!);

  // Only show session when on a session route
  const { sessionId: activeSessionId } = useParams<{ sessionId: string }>();

  // Try to get session from React Query cache first (for sidebar sessions)
  const { session: cachedSession } = useActiveSession();

  // Build current session with proper display name logic
  // Use utility function for consistent session naming
  // Only use cachedSession (from React Query) as it has all required fields
  const currentSession: SessionResponse | null = activeSessionId && cachedSession ? {
    ...cachedSession,
    name: getSessionDisplayName(cachedSession)
  } : null;

  // Sync projectId with navigationStore on mount and when id changes
  useEffect(() => {
    if (id) {
      setActiveProject(id);
    }

    // Cleanup: clear navigation on unmount
    return () => {
      clearNavigation();
    };
  }, [id, setActiveProject, clearNavigation]);

  // Redirect to root if project is not found or deleted
  useEffect(() => {
    if (error) {
      toast.error("Project not found or has been deleted");
      navigate("/", { replace: true });
    }
  }, [error, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Skeleton className="h-12 w-full" />
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  // Error state - return null since we're redirecting via useEffect
  if (error) {
    return null;
  }

  // Not found state
  if (!project) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" onClick={() => navigate("/projects")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Project not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ProjectHeader
        projectId={id!}
        projectName={project.name}
        projectPath={project.path}
        gitCapabilities={project.capabilities.git}
        currentSession={currentSession}
      />

      {/* Content area */}
      <div className="flex-1 relative">
        <Outlet />
      </div>
    </div>
  );
}
