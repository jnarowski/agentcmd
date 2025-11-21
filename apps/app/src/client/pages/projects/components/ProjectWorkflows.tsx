import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/client/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/client/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Workflow, Plus, Settings, Play } from "lucide-react";
import { useWorkflowRuns } from "@/client/pages/projects/workflows/hooks/useWorkflowRuns";
import { useWorkflowDefinitions } from "@/client/pages/projects/workflows/hooks/useWorkflowDefinitions";
import { useWebhooks } from "@/client/pages/projects/webhooks/hooks/useWebhooks";
import { WorkflowRunCard } from "@/client/pages/projects/workflows/components/WorkflowRunCard";
import { WebhookCard } from "@/client/pages/projects/webhooks/components/WebhookCard";

interface ProjectWorkflowsProps {
  projectId: string;
}

/**
 * Workflows section for project home page
 * Shows workflow runs, definitions, and webhooks in tabs
 */
export function ProjectWorkflows({ projectId }: ProjectWorkflowsProps) {
  const navigate = useNavigate();
  const { data: runs, isLoading: isLoadingRuns } = useWorkflowRuns(projectId);
  const { data: definitions, isLoading: isLoadingDefs } =
    useWorkflowDefinitions(projectId, "active");
  const { data: webhooks, isLoading: isLoadingWebhooks } =
    useWebhooks(projectId);

  const isLoading = isLoadingRuns || isLoadingDefs || isLoadingWebhooks;

  const handleNewRun = () => {
    navigate(`/projects/${projectId}/workflows/new`);
  };

  const handleNewWebhook = () => {
    navigate(`/projects/${projectId}/webhooks/new`);
  };

  const handleManageWorkflows = () => {
    navigate(`/projects/${projectId}/workflows/manage`);
  };

  const handleRunClick = (run: {
    id: string;
    workflow_definition_id: string;
  }) => {
    navigate(
      `/projects/${projectId}/workflows/${run.workflow_definition_id}/runs/${run.id}`
    );
  };

  const handleDefinitionClick = (definitionId: string) => {
    navigate(`/projects/${projectId}/workflows/${definitionId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  // Show recent runs (limit to 6)
  const recentRuns = runs?.slice(0, 6) || [];
  const recentWebhooks = webhooks?.slice(0, 6) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <span className="truncate">Workflows</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="runs" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="runs">
              Runs {recentRuns.length > 0 && `(${recentRuns.length})`}
            </TabsTrigger>
            <TabsTrigger value="definitions">
              Definitions {definitions && `(${definitions.length})`}
            </TabsTrigger>
            <TabsTrigger value="webhooks">
              Webhooks {webhooks && `(${webhooks.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Runs Tab */}
          <TabsContent value="runs" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Recent workflow executions
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleNewRun}
              >
                <Plus className="size-4" />
                New Run
              </Button>
            </div>
            {recentRuns.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recentRuns.map((run) => (
                  <WorkflowRunCard
                    key={run.id}
                    run={run}
                    onClick={() => handleRunClick(run)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Workflow className="size-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    No workflow runs yet
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Execute workflows to automate tasks with AI agents
                  </p>
                </div>
                <Button onClick={handleNewRun} className="gap-2">
                  <Plus className="size-4" />
                  Create your first run
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Definitions Tab */}
          <TabsContent value="definitions" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Configured workflow templates
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleManageWorkflows}
              >
                <Settings className="size-4" />
                Manage
              </Button>
            </div>
            {definitions && definitions.length > 0 ? (
              <div className="space-y-2">
                {definitions.map((def) => (
                  <div
                    key={def.id}
                    onClick={() => handleDefinitionClick(def.id)}
                    className="group cursor-pointer rounded-lg border bg-card p-4 transition-all hover:shadow-md hover:border-primary/50"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleDefinitionClick(def.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-foreground truncate">
                          {def.name}
                        </h3>
                        {def.description && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {def.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {def._count && (
                          <div className="text-xs text-muted-foreground">
                            {def._count.runs} runs
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNewRun();
                          }}
                        >
                          <Play className="h-4 w-4" />
                          <span className="sr-only">Run workflow</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Workflow className="size-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    No workflows configured
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Set up workflow definitions to automate your tasks
                  </p>
                </div>
                <Button onClick={handleManageWorkflows} className="gap-2">
                  <Settings className="size-4" />
                  Setup workflows
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Webhook integrations for triggering workflows
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleNewWebhook}
              >
                <Plus className="size-4" />
                New Webhook Trigger
              </Button>
            </div>
            {recentWebhooks.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recentWebhooks.map((webhook) => (
                  <WebhookCard
                    key={webhook.id}
                    webhook={webhook}
                    projectId={projectId}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Workflow className="size-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No webhooks yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Configure webhooks to trigger workflows from external
                    services
                  </p>
                </div>
                <Button onClick={handleNewWebhook} className="gap-2">
                  <Plus className="size-4" />
                  Create your first webhook
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
