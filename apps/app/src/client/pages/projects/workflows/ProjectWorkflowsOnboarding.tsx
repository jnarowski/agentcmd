import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { WorkflowPackageInstallDialog } from "@/client/pages/projects/components/WorkflowPackageInstallDialog";
import { workflowKeys } from "@/client/pages/projects/workflows/hooks/queryKeys";
import { useState } from "react";

export function ProjectWorkflowsOnboarding() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const { data: project } = useProject(projectId!);
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  const handleRefreshDefinitions = () => {
    queryClient.invalidateQueries({
      queryKey: workflowKeys.definitionsList(projectId!),
    });
  };

  const handleCloseInstallDialog = () => {
    setShowInstallDialog(false);
    handleRefreshDefinitions();
  };

  const isPackageInstalled =
    project?.capabilities?.workflow_sdk?.installed ?? false;

  return (
    <>
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Workflow Setup</h1>
          <p className="text-muted-foreground">
            {!isPackageInstalled
              ? "Install the workflow package to get started"
              : "Create your first workflow definition"}
          </p>
        </div>

        {/* Empty State: Package Not Installed */}
        {!isPackageInstalled && (
          <div className="rounded-lg border border-muted bg-muted/10 p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.29 7 12 12 20.71 7" />
                <line x1="12" y1="22" x2="12" y2="12" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-3">
              Workflow Package Not Installed
            </h2>
            <p className="text-base text-muted-foreground mb-6 max-w-md mx-auto">
              Install{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm">
                agentcmd-workflows
              </code>{" "}
              to create and run workflow definitions.
            </p>
            <Button onClick={() => setShowInstallDialog(true)} size="lg">
              Install Workflow Package
            </Button>
          </div>
        )}

        {/* Empty State: No Definitions Created */}
        {isPackageInstalled && (
          <div className="rounded-lg border border-muted bg-muted/10 p-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-3 text-center">
              Create Your First Workflow
            </h2>
            <p className="text-base text-muted-foreground mb-6 text-center">
              No workflow definitions found. Create a workflow definition file
              to get started.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm font-medium mb-2">
                  1. Navigate to project directory:
                </p>
                <code className="block px-4 py-3 rounded bg-muted text-sm">
                  cd {project?.path || "[project-path]"}
                </code>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">
                  2. Create a definition file:
                </p>
                <code className="block px-4 py-3 rounded bg-muted text-sm">
                  .agent/workflows/definitions/my-workflow.ts
                </code>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">3. Add example code:</p>
                <pre className="px-4 py-3 rounded bg-muted text-sm overflow-x-auto">
                  {`import { defineWorkflow } from 'agentcmd-workflows';

export default defineWorkflow({
  identifier: 'my-workflow',
  name: 'My First Workflow',
  description: 'Example workflow',
  phases: ['setup', 'execute', 'verify'],
});`}
                </pre>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={handleRefreshDefinitions} size="lg">
                Refresh
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a
                  href="https://github.com/anthropics/agentcmd-workflows"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Documentation
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Install Dialog */}
      {project && (
        <WorkflowPackageInstallDialog
          isOpen={showInstallDialog}
          onClose={handleCloseInstallDialog}
          projectId={projectId!}
          sdkStatus={project.capabilities.workflow_sdk}
        />
      )}
    </>
  );
}
