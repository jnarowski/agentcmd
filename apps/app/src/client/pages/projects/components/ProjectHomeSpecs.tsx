import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { AgentIcon } from "@/client/components/AgentIcon";
import { SessionStateBadge } from "@/client/pages/projects/sessions/components/SessionStateBadge";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";
import { useSpecs } from "@/client/hooks/useSpecs";
import { useRescanSpecs } from "@/client/hooks/useRescanSpecs";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Loader2, FileText, ExternalLink, Sparkles } from "lucide-react";
import { useSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import type { SessionResponse } from "@/shared/types";
import type { AgentType } from "@/shared/types/agent.types";
import { format, formatDistanceToNow } from "date-fns";

interface ProjectHomeSpecsProps {
  projectId: string;
}

/**
 * Specs tab content for project home page
 * Shows Specs + Planning Sessions
 */
export function ProjectHomeSpecs({ projectId }: ProjectHomeSpecsProps) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useSpecs(projectId);
  const { data: allSessions } = useSessions({ projectId });
  const rescanMutation = useRescanSpecs();

  const handleRescan = () => {
    rescanMutation.mutate();
  };

  const handleOpenWorkflow = (
    specPath: string,
    taskProjectId: string,
    taskName: string
  ) => {
    const relativeSpecPath = specPath.startsWith("todo/")
      ? specPath.slice(5)
      : specPath;

    navigate(
      `/projects/${taskProjectId}/workflows/new?specFile=${encodeURIComponent(relativeSpecPath)}&name=${encodeURIComponent(taskName)}`
    );
  };

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        Failed to load specs
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading specs...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Specs Section */}
      {data && data.specs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Specs
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-8 w-8 p-0"
              onClick={handleRescan}
              disabled={rescanMutation.isPending || isLoading}
              aria-label="Refresh specs"
            >
              {rescanMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {data.specs.map((task) => (
              <Card
                key={task.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() =>
                  handleOpenWorkflow(task.specPath, task.projectId, task.name)
                }
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <FileText className="size-4 shrink-0 mt-0.5" />
                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      <span className="text-sm truncate">
                        {task.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="h-4 px-1.5 text-[10px] bg-muted/50 text-muted-foreground hover:bg-muted/50"
                        >
                          {task.status}
                        </Badge>
                        {task.spec_type && task.spec_type !== "feature" && (
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[10px]"
                          >
                            {task.spec_type}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(task.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Planning Sessions Section */}
      {data && data.planningSessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Planning Sessions
          </h3>
          <div className="grid gap-2 md:grid-cols-2">
            {data.planningSessions.map((planningSummary) => {
              const fullSession = allSessions?.find(
                (s) => s.id === planningSummary.id
              );

              const session: SessionResponse = fullSession || {
                id: planningSummary.id,
                projectId: planningSummary.projectId,
                userId: planningSummary.userId,
                name: planningSummary.name,
                agent: planningSummary.agent as AgentType,
                type: planningSummary.type as "chat" | "workflow",
                permission_mode: "plan",
                state: planningSummary.state as "idle" | "working" | "error",
                is_archived: planningSummary.is_archived,
                archived_at: null,
                created_at: planningSummary.created_at,
                updated_at: planningSummary.updated_at,
                metadata: {
                  totalTokens: 0,
                  messageCount: 0,
                  lastMessageAt: new Date(
                    planningSummary.updated_at
                  ).toISOString(),
                  firstMessagePreview: "",
                },
              };

              const displayName = getSessionDisplayName(session);
              const timeAgo = format(new Date(session.created_at), "MM/dd 'at' h:mma");

              return (
                <Card
                  key={planningSummary.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => navigate(`/projects/${planningSummary.projectId}/sessions/${planningSummary.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <AgentIcon agent={planningSummary.agent as AgentType} className="size-4 shrink-0 mt-0.5" />
                      <div className="flex flex-1 flex-col gap-1 min-w-0">
                        <span className="text-sm truncate">
                          {displayName}
                        </span>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {timeAgo}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className="h-4 px-1.5 py-0 text-xs bg-green-500/10 text-green-600 border-green-500/20"
                          >
                            Plan
                          </Badge>
                          <SessionStateBadge
                            state={session.state}
                            errorMessage={session.error_message}
                            compact
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data &&
        data.specs.length === 0 &&
        data.planningSessions.length === 0 && (
          <div className="py-12 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                <Sparkles className="size-6 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No specs yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Specs are structured documents that guide AI agents to implement features, fix bugs, or plan projects.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Create specs using slash commands:
              </p>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <code className="bg-muted px-2 py-1 rounded mx-auto">/cmd:generate-feature-spec</code>
                <code className="bg-muted px-2 py-1 rounded mx-auto">/cmd:generate-bug-spec</code>
                <code className="bg-muted px-2 py-1 rounded mx-auto">/cmd:generate-prd</code>
              </div>
            </div>
            <Button
              variant="link"
              size="sm"
              asChild
              className="text-primary"
            >
              <a
                href="https://agentcmd.com/docs/specs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1"
              >
                Learn more about specs
                <ExternalLink className="size-3" />
              </a>
            </Button>
          </div>
        )}
    </div>
  );
}
