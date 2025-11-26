import { useQueryClient } from "@tanstack/react-query";
import { BaseDialog } from "@/client/components/BaseDialog";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { useProject, projectKeys } from "@/client/pages/projects/hooks/useProjects";
import { WorkflowPackageInstallDialog } from "@/client/pages/projects/components/WorkflowPackageInstallDialog";
import { workflowKeys } from "@/client/pages/projects/workflows/hooks/queryKeys";
import { useState } from "react";

interface WorkflowOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onComplete?: () => void;
}

export function WorkflowOnboardingDialog({
  open,
  onOpenChange,
  projectId,
  onComplete,
}: WorkflowOnboardingDialogProps) {
  const queryClient = useQueryClient();
  const { data: project } = useProject(projectId);
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  const handleRefreshDefinitions = () => {
    queryClient.invalidateQueries({ queryKey: workflowKeys.definitionsList(projectId) });
  };

  const handleCloseInstallDialog = () => {
    setShowInstallDialog(false);
    // Refresh project data to update capabilities
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    // Refresh definitions after dialog closes (in case install succeeded)
    handleRefreshDefinitions();
    // Check if we should complete onboarding
    if (onComplete) {
      // Give query time to invalidate and refetch
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  };

  // Check if package is installed
  const isPackageInstalled = project?.capabilities?.workflow_sdk?.installed ?? false;

  return (
    <>
      <BaseDialog
        open={open}
        onOpenChange={onOpenChange}
        contentProps={{ className: "sm:max-w-[650px]", noPadding: true }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl">Workflow Setup</DialogTitle>
          <DialogDescription className="text-base">
            {!isPackageInstalled
              ? "Install the workflow package to get started"
              : "Create your first workflow definition"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          {/* Empty State: Package Not Installed */}
          {!isPackageInstalled && (
            <div className="rounded-lg border border-muted bg-muted/10 p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.29 7 12 12 20.71 7"/>
                  <line x1="12" y1="22" x2="12" y2="12"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Workflow Package Not Installed</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Install <code className="px-1.5 py-0.5 rounded bg-muted text-xs">agentcmd-workflows</code> to create and run workflow definitions.
              </p>
              <Button onClick={() => setShowInstallDialog(true)}>
                Install Workflow Package
              </Button>
            </div>
          )}

          {/* Empty State: No Definitions Created */}
          {isPackageInstalled && (
            <div className="rounded-lg border border-muted bg-muted/10 p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Create Your First Workflow</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No workflow definitions found. Create a workflow definition file to get started.
              </p>

              <div className="text-left space-y-3 mb-4">
                <div>
                  <p className="text-sm font-medium mb-1">1. Navigate to project directory:</p>
                  <code className="block px-3 py-2 rounded bg-muted text-xs">
                    cd {project?.path || '[project-path]'}
                  </code>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">2. Create a definition file:</p>
                  <code className="block px-3 py-2 rounded bg-muted text-xs">
                    .agent/workflows/definitions/my-workflow.ts
                  </code>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">3. Add example code:</p>
                  <pre className="px-3 py-2 rounded bg-muted text-xs overflow-x-auto">
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

              <div className="flex gap-2">
                <Button onClick={handleRefreshDefinitions} variant="default">
                  Refresh
                </Button>
                <Button variant="outline" asChild>
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
      </BaseDialog>

      {/* Install Dialog */}
      {project && (
        <WorkflowPackageInstallDialog
          isOpen={showInstallDialog}
          onClose={handleCloseInstallDialog}
          projectId={projectId}
          sdkStatus={project.capabilities.workflow_sdk}
        />
      )}
    </>
  );
}
