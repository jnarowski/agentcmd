/**
 * ProjectOnboardingSuggestions Component
 * Shows project-specific setup requirements (Workflow SDK)
 */

import { useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import { Badge } from "@/client/components/ui/badge";
import { WorkflowPackageInstallDialog } from "./WorkflowPackageInstallDialog";
import type { Project } from "@/shared/types/project.types";

interface ProjectOnboardingSuggestionsProps {
  project: Project;
}

export function ProjectOnboardingSuggestions({
  project,
}: ProjectOnboardingSuggestionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isInstalled = project.capabilities.workflow_sdk.installed;

  return (
    <>
      <Alert className="relative py-3">
        <AlertTitle className="text-sm font-semibold mb-2 flex items-center gap-2">
          {isInstalled ? "Project Setup Complete!" : "Project Setup"}
          <Badge variant="secondary" className="text-xs">
            {isInstalled ? "1/1" : "0/1"}
          </Badge>
        </AlertTitle>

        <AlertDescription>
          <div
            className={`flex items-center justify-between gap-1.5 px-4 py-2.5 rounded border bg-card text-xs w-full ${
              !isInstalled ? "cursor-pointer hover:bg-accent" : ""
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
                <span className="font-medium text-base truncate">
                  Install agentcmd-workflows
                </span>
                <span className="text-muted-foreground text-xs">
                  {isInstalled
                    ? `v${project.capabilities.workflow_sdk.version} installed`
                    : "Required to build workflows"}
                </span>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <WorkflowPackageInstallDialog
        projectId={project.id}
        sdkStatus={project.capabilities.workflow_sdk}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
