import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/client/stores/index";
import { useSyncProjects, useProjects } from "@/client/pages/projects/hooks/useProjects";
import { projectKeys } from "@/client/pages/projects/hooks/queryKeys";
import { settingsKeys } from "@/client/hooks/queryKeys";
import { useSettings } from "@/client/hooks/useSettings";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import { useTheme } from "next-themes";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { useIsMobile } from "@/client/hooks/use-mobile";
import { AppSidebar } from "@/client/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/client/components/ui/sidebar";
import { ConnectionStatusBanner } from "@/client/components/ConnectionStatusBanner";
import { api } from "@/client/utils/api";
import { workflowKeys } from "@/client/pages/projects/workflows/hooks/queryKeys";

/**
 * Main authenticated app layout
 * Replaces ProtectedLayout, ProjectDetailLayout, and WorkflowLayout
 *
 * Features:
 * - Sidebar always visible with toggle (minimizes to icons on desktop)
 * - Sidebar closed by default on mobile
 * - Pages render their own headers (ProjectHeader, PageHeader)
 */
function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const initializeFromSettings = useSessionStore((s) => s.initializeFromSettings);
  const { setTheme } = useTheme();
  const { readyState, reconnectAttempt, reconnect } = useWebSocket();
  const isMobile = useIsMobile();

  // Prefetch settings and workflow definitions on mount to prevent race conditions
  // where multiple components call hooks before first request completes, triggering duplicate fetches
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: settingsKeys.all,
      queryFn: () => api.get<{ data: unknown }>("/api/settings").then(res => res.data),
    });

    // Prefetch all workflow definitions (used in ProjectItem dropdown)
    queryClient.prefetchQuery({
      queryKey: workflowKeys.allDefinitions('active'),
      queryFn: async () => {
        const response = await api.get<{ data: unknown[] }>('/api/workflow-definitions?status=active');
        // Parse JSON fields (matching useAllWorkflowDefinitions logic)
        return response.data.map((def: unknown) => {
          const item = def as Record<string, unknown>;
          return {
            ...item,
            phases: typeof item.phases === 'string' ? JSON.parse(item.phases) : item.phases,
            args_schema: typeof item.args_schema === 'string' ? JSON.parse(item.args_schema) : item.args_schema,
          };
        });
      },
    });
  }, [queryClient]);

  // Load settings early so they're available for all protected routes
  // Settings are cached by TanStack Query (5-minute stale time)
  const { data: settings } = useSettings();

  // Load projects early so they're cached for sidebar components
  // Prevents project ID flash in sidebar before project names resolve
  useProjects();

  // Initialize session store defaults and theme from user preferences
  useEffect(() => {
    if (settings?.userPreferences) {
      // Initialize session store with user preferences
      initializeFromSettings({
        permissionMode: settings.userPreferences.default_permission_mode,
        agent: settings.userPreferences.default_agent,
      });

      // Set theme from user preferences
      setTheme(settings.userPreferences.default_theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.userPreferences]);

  // Sync projects from Claude CLI on mount
  // TanStack Query handles caching automatically (5-minute stale time)
  const { data: syncResult, isSuccess } = useSyncProjects();

  // Invalidate projects list when sync completes successfully
  useEffect(() => {
    if (isSuccess && syncResult) {
      // Invalidate projects list to show newly synced projects
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      // Note: Session lists now managed by Zustand, no React Query invalidation needed

      if (import.meta.env.DEV) {
        console.log(
          `Projects synced: ${syncResult.projectsImported} imported, ${syncResult.projectsUpdated} updated`
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, syncResult]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider
      defaultOpen={!isMobile}
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <AppSidebar collapsible="offcanvas" />
      <SidebarInset>
        <ConnectionStatusBanner
          readyState={readyState}
          reconnectAttempt={reconnectAttempt}
          onReconnect={reconnect}
        />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AppLayout;
