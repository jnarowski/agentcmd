import { Outlet, useParams, Navigate } from "react-router-dom";
import { ConnectionStatusBanner } from "@/client/components/ConnectionStatusBanner";
import { ProjectHeader } from "@/client/components/ProjectHeader";
import { AppSidebar } from "@/client/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/client/components/ui/sidebar";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { useProjectsWithSessions } from "@/client/pages/projects/hooks/useProjects";
import { useAuthStore } from "@/client/stores/index";
import { Skeleton } from "@/client/components/ui/skeleton";

/**
 * Dedicated layout for workflow pages
 * Uses slide-out AppSidebar (overlay mode) to save space
 * Sidebar starts closed and slides in from left when triggered
 */
export default function WorkflowLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const { readyState, connectionAttempts, reconnect } = useWebSocket();
  const { data: projects, isLoading } = useProjectsWithSessions();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const project = projects?.find(p => p.id === projectId);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <Skeleton className="h-14 w-full" />
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <AppSidebar collapsible="offcanvas" />
      <SidebarInset>
        <div className="flex flex-col h-screen overflow-hidden">
          <ConnectionStatusBanner
            readyState={readyState}
            connectionAttempts={connectionAttempts}
            onReconnect={reconnect}
          />

          {/* Use the same ProjectHeader for consistency */}
          <ProjectHeader
            projectId={projectId!}
            projectName={project.name}
            projectPath={project.path}
            gitCapabilities={project.capabilities.git}
            showSidebarTrigger={true}
            sidebarTriggerAlwaysVisible={true}
          />

          {/* Full-width content area */}
          <main className="flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
