import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/client/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Workflow, Plus } from "lucide-react";
import { useWorkflowRuns } from "@/client/pages/projects/workflows/hooks/useWorkflowRuns";
import { WorkflowRunCard } from "@/client/pages/projects/workflows/components/WorkflowRunCard";

interface ProjectWorkflowsProps {
  projectId: string;
}

/**
 * Workflows section for project home page
 * Shows recent workflow runs
 */
export function ProjectWorkflows({ projectId }: ProjectWorkflowsProps) {
  const navigate = useNavigate();
  const { data: runs, isLoading, error } = useWorkflowRuns(projectId);

  const handleNewRun = () => {
    navigate(`/projects/${projectId}/workflows/new`);
  };

  const handleRunClick = (run: { id: string; workflow_definition_id: string }) => {
    navigate(
      `/projects/${projectId}/workflows/${run.workflow_definition_id}/runs/${run.id}`
    );
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Failed to load workflows
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading workflows...
        </CardContent>
      </Card>
    );
  }

  // Show recent runs (limit to 6)
  const recentRuns = runs?.slice(0, 6) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <span className="truncate">Workflows</span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-8 gap-1.5"
            onClick={handleNewRun}
          >
            <Plus className="size-4" />
            New
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Workflow Runs Grid */}
          {recentRuns.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentRuns.map((run) => (
                <WorkflowRunCard
                  key={run.id}
                  run={run}
                  onClick={() => handleRunClick(run)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {recentRuns.length === 0 && (
            <div className="py-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Workflow className="size-6 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No workflow runs yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Workflows automate tasks like code generation, testing, and
                  deployment using AI agents.
                </p>
              </div>
              <Button onClick={handleNewRun} className="gap-2">
                <Plus className="size-4" />
                Create your first workflow run
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
