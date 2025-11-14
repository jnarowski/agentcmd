import { useMemo } from "react";
import { format } from "date-fns";
import { Combobox, type ComboboxOption } from "@/client/components/ui/combobox";
import { Badge } from "@/client/components/ui/badge";
import { AgentIcon } from "@/client/components/AgentIcon";
import { SessionStateBadge } from "@/client/pages/projects/sessions/components/SessionStateBadge";
import { useSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";
import type { SessionResponse } from "@/shared/types";

interface PlanningSessionOption extends ComboboxOption<string> {
  session: SessionResponse;
}

interface PlanningSessionSelectProps {
  projectId: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function PlanningSessionSelect({
  projectId,
  value,
  onValueChange,
  disabled,
}: PlanningSessionSelectProps) {
  const { data: sessions } = useSessions({ projectId });
  const { data: project } = useProject(projectId);
  const projectName = project?.name || "Unknown Project";

  const planningSessionOptions = useMemo<PlanningSessionOption[]>(() => {
    if (!sessions) return [];
    return sessions
      .filter((session) => session.permission_mode === "plan")
      .map((session) => ({
        value: session.id,
        label: getSessionDisplayName(session),
        session,
      }));
  }, [sessions]);

  return (
    <Combobox
      value={value}
      onValueChange={onValueChange}
      options={planningSessionOptions}
      placeholder="Select planning session..."
      searchPlaceholder="Search sessions..."
      emptyMessage="No planning sessions found"
      disabled={disabled}
      renderOption={(option) => {
        const planningOption = option as PlanningSessionOption;
        const session = planningOption.session;
        if (!session) return <span>{planningOption.label}</span>;

        const displayName = getSessionDisplayName(session);
        const timeAgo = format(new Date(session.created_at), "MM/dd 'at' h:mma");

        return (
          <div className="flex items-start gap-2 w-full py-1">
            {session.agent && (
              <AgentIcon agent={session.agent} className="size-4 shrink-0 mt-0.5" />
            )}
            <div className="flex flex-1 flex-col gap-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">
                  {displayName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="tabular-nums">{timeAgo}</span>
                <span>•</span>
                <span>{projectName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {session.permission_mode === "plan" && (
                  <Badge
                    variant="secondary"
                    className="text-xs px-1.5 py-0 h-4 bg-green-500/10 text-green-600 border-green-500/20 shrink-0"
                  >
                    Plan
                  </Badge>
                )}
                <SessionStateBadge
                  state={session.state}
                  errorMessage={session.error_message}
                  compact
                />
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
