import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Plus } from "lucide-react";
import {
  SidebarMenu,
  SidebarGroupLabel,
  useSidebar,
} from "@/client/components/ui/sidebar";
import { Button } from "@/client/components/ui/button";
import { useNavigationStore } from "@/client/stores";
import {
  useProjects,
  useSyncProjectsMutation,
} from "@/client/pages/projects/hooks/useProjects";
import { useSessionList } from "@/client/hooks/useSessionList";
import { SessionItem } from "@/client/components/sidebar/SessionItem";
import { SessionDialog } from "@/client/pages/projects/sessions/components/SessionDialog";
import { SessionFileViewer } from "@/client/pages/projects/sessions/components/SessionFileViewer";
import {
  useSessionStore,
  type SessionSummary,
} from "@/client/pages/projects/sessions/stores/sessionStore";
import type { AgentType } from "@/shared/types/agent.types";

interface SessionActivity {
  id: string;
  projectId: string;
  projectName: string;
  status: string;
  createdAt: Date;
  agent?: AgentType;
  session: SessionSummary;
}

export function NavSessions() {
  const navigate = useNavigate();
  const activeSessionId = useNavigationStore((s) => s.activeSessionId);
  const activeProjectId = useNavigationStore((s) => s.activeProjectId);
  const { data: projects } = useProjects();
  const queryClient = useQueryClient();
  const syncProjectsMutation = useSyncProjectsMutation();
  const { isMobile, setOpenMobile } = useSidebar();

  // Dialog state - lifted from SessionItem to survive dropdown unmount
  const [editSession, setEditSession] = useState<SessionSummary | null>(null);
  const [viewFileSession, setViewFileSession] = useState<SessionSummary | null>(null);
  const updateSession = useSessionStore((s) => s.updateSession);

  // Fetch only chat sessions
  const { sessions } = useSessionList(activeProjectId || null, {
    limit: 20,
    orderBy: "created_at",
    order: "desc",
    type: "chat",
  });

  // Map sessions to Activity type, join with project names
  const sessionActivities = useMemo(() => {
    if (!sessions) return [];

    const activities: SessionActivity[] = [];
    for (const session of sessions) {
      const project = projects?.find((p) => p.id === session.projectId);

      const projectName = project?.name ?? session.projectId;
      activities.push({
        id: session.id,
        projectId: session.projectId,
        projectName:
          projectName && projectName.length > 30
            ? projectName.slice(0, 30) + "..."
            : projectName,
        status: session.state,
        createdAt: new Date(session.created_at),
        agent: session.agent,
        session: session,
      });
    }
    return activities;
  }, [sessions, projects]);

  const handleRefresh = () => {
    syncProjectsMutation.mutate(undefined, {
      onSuccess: () => {
        // Invalidate session queries
        queryClient.invalidateQueries({ queryKey: ["sessions"] });
      },
    });
  };

  const handleNewSession = () => {
    if (activeProjectId) {
      navigate(`/projects/${activeProjectId}/sessions/new`);
      if (isMobile) {
        setOpenMobile(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-2 shrink-0 flex items-center gap-2">
        <SidebarGroupLabel>All</SidebarGroupLabel>
        {activeProjectId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleNewSession}
            className="ml-auto h-8 w-8 md:h-6 md:w-6 p-0 flex items-center justify-center"
            aria-label="Create new session"
          >
            <Plus className="size-5 md:size-3.5" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          disabled={syncProjectsMutation.isPending}
          className={`hidden md:flex h-6 w-6 p-0 items-center justify-center ${!activeProjectId ? "ml-auto" : ""}`}
          aria-label="Refresh sessions"
        >
          <RefreshCw
            className={`size-3.5 ${syncProjectsMutation.isPending ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto border-t pt-2">
        {sessionActivities.length === 0 ? (
          <div className="py-4 px-2 text-center text-sm text-muted-foreground">
            {activeProjectId
              ? "No sessions in this project"
              : "No recent sessions"}
          </div>
        ) : (
          <SidebarMenu className="px-2">
            {sessionActivities.map((activity) => (
              <SessionItem
                key={activity.id}
                id={activity.id}
                projectId={activity.projectId}
                projectName={activity.projectName}
                status={activity.status}
                agent={activity.agent}
                session={activity.session}
                isActive={activity.id === activeSessionId}
                onEdit={setEditSession}
                onViewFile={setViewFileSession}
              />
            ))}
          </SidebarMenu>
        )}
      </div>

      {/* Dialogs rendered at parent level to survive dropdown unmount */}
      <SessionDialog
        session={editSession}
        open={!!editSession}
        onOpenChange={(open) => !open && setEditSession(null)}
        onUpdateSession={async (sessionId, name) => {
          await updateSession(sessionId, { name });
        }}
      />
      {viewFileSession && (
        <SessionFileViewer
          sessionId={viewFileSession.id}
          open={!!viewFileSession}
          onOpenChange={(open) => !open && setViewFileSession(null)}
        />
      )}
    </div>
  );
}
