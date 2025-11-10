import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/client/stores/index";
import { useSyncProjects } from "@/client/pages/projects/hooks/useProjects";
import { projectKeys } from "@/client/pages/projects/hooks/queryKeys";
import { settingsKeys } from "@/client/hooks/queryKeys";
import { useSettings } from "@/client/hooks/useSettings";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import { useTheme } from "next-themes";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { AppSidebar } from "@/client/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/client/components/ui/sidebar";
import { ConnectionStatusBanner } from "@/client/components/ConnectionStatusBanner";
import { api } from "@/client/utils/api";
import { workflowKeys } from "@/client/pages/projects/workflows/hooks/queryKeys";

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const initializeFromSettings = useSessionStore((s) => s.initializeFromSettings);
  const { setTheme } = useTheme();
  const { readyState, reconnectAttempt, reconnect } = useWebSocket();

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
        return response.data.map((def: any) => ({
          ...def,
          phases: typeof def.phases === 'string' ? JSON.parse(def.phases) : def.phases,
          args_schema: typeof def.args_schema === 'string' ? JSON.parse(def.args_schema) : def.args_schema,
        }));
      },
    });
  }, [queryClient]);

  // Load settings early so they're available for all protected routes
  // Settings are cached by TanStack Query (5-minute stale time)
  const { data: settings } = useSettings();

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
      queryClient.invalidateQueries({ queryKey: projectKeys.withSessions() });

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
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <ConnectionStatusBanner
        readyState={readyState}
        reconnectAttempt={reconnectAttempt}
        onReconnect={reconnect}
      />
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default ProtectedLayout;
