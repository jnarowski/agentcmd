/**
 * ProjectOnboardingSuggestions Component
 * Shows project-specific setup requirements (Workflow SDK)
 */

import { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/client/components/ui/alert';
import { Badge } from '@/client/components/ui/badge';
import { useWorkflowSdkCheck } from '@/client/pages/projects/hooks/useProjects';
import { WorkflowSdkInstallDialog } from './WorkflowSdkInstallDialog';

interface ProjectOnboardingSuggestionsProps {
  projectId: string;
}

export function ProjectOnboardingSuggestions({ projectId }: ProjectOnboardingSuggestionsProps) {
  const { data: workflowSdkCheck } = useWorkflowSdkCheck(projectId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Don't render if check hasn't loaded yet
  if (!workflowSdkCheck) {
    return null;
  }

  const isInstalled = workflowSdkCheck.installed;

  return (
    <>
      <Alert className="relative py-3">
        <AlertTitle className="text-sm font-semibold mb-2 flex items-center gap-2">
          {isInstalled ? 'Project Setup Complete!' : 'Project Setup'}
          <Badge variant="secondary" className="text-xs">
            {isInstalled ? '1/1' : '0/1'}
          </Badge>
        </AlertTitle>

        <AlertDescription>
          <div
            className={`flex items-center justify-between gap-1.5 px-4 py-2.5 rounded border bg-card text-xs w-full ${
              !isInstalled ? 'cursor-pointer hover:bg-accent' : ''
            }`}
            onClick={() => !isInstalled && setIsDialogOpen(true)}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {isInstalled ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">Install Workflow SDK</span>
                <span className="text-muted-foreground text-xs">
                  {isInstalled
                    ? `v${workflowSdkCheck.version} installed`
                    : 'Required for workflow run'}
                </span>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <WorkflowSdkInstallDialog
        projectId={projectId}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
