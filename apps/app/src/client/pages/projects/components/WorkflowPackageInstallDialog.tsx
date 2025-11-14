/**
 * WorkflowPackageInstallDialog Component
 * Dialog for installing agentcmd-workflows package in a project
 */

import { useState } from "react";
import { Loader2, Copy, Check, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Button } from "@/client/components/ui/button";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import {
  useInstallWorkflowPackage,
  type WorkflowPackageInstallResult,
} from "@/client/pages/projects/hooks/useProjects";
import type { WorkflowPackageCapabilities } from "@/shared/types/project.types";

interface WorkflowPackageInstallDialogProps {
  projectId: string;
  sdkStatus: WorkflowPackageCapabilities;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkflowPackageInstallDialog({
  projectId,
  sdkStatus,
  isOpen,
  onClose,
}: WorkflowPackageInstallDialogProps) {
  const installMutation = useInstallWorkflowPackage();
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("npm");
  const [installResult, setInstallResult] =
    useState<WorkflowPackageInstallResult | null>(null);

  const handleInstall = async () => {
    const result = await installMutation.mutateAsync(projectId);
    setInstallResult(result);
  };

  const handleClose = () => {
    setInstallResult(null);
    onClose();
  };

  const handleCopy = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const commands = {
    npm: "npm install --save-dev agentcmd-workflows && npx agentcmd-workflows init",
    pnpm: "pnpm add -D agentcmd-workflows && pnpm agentcmd-workflows init",
    yarn: "yarn add -D agentcmd-workflows && yarn agentcmd-workflows init",
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Install Workflow Package</DialogTitle>
          <DialogDescription>
            Install agentcmd-workflows to enable workflow execution in this
            project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {installResult ? (
            <div className="space-y-4">
              {!installResult.success && (
                <Alert variant="destructive">
                  <AlertDescription>{installResult.message}</AlertDescription>
                </Alert>
              )}

              {installResult.output && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Installation Output</p>
                  <div className="max-h-64 overflow-y-auto rounded border bg-muted/50 p-3">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {installResult.output.trim()}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                {installResult.success && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{installResult.message}</span>
                  </div>
                )}
                <Button onClick={handleClose} className="ml-auto">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              {!sdkStatus.has_package_json && (
                <Alert>
                  <AlertDescription>
                    No package.json found. Click "Install Now" to create a
                    package.json and install agentcmd-workflows automatically.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Manual Installation</p>
                <p className="text-xs text-muted-foreground">
                  Choose your package manager:
                </p>

                <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="npm">npm</TabsTrigger>
                    <TabsTrigger value="pnpm">pnpm</TabsTrigger>
                    <TabsTrigger value="yarn">yarn</TabsTrigger>
                  </TabsList>

                  {Object.entries(commands).map(([pm, command]) => (
                    <TabsContent key={pm} value={pm}>
                      <div className="flex items-center gap-2 p-2 rounded border bg-muted/50">
                        <code className="flex-1 text-xs overflow-x-auto">
                          {command}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleCopy(command)}
                        >
                          {copiedCommand === command ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button
                  onClick={handleInstall}
                  disabled={installMutation.isPending}
                  className="flex-1"
                >
                  {installMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    "Install Now"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  disabled={installMutation.isPending}
                >
                  Close
                </Button>
              </div>

              {installMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {installMutation.error?.message || "Installation failed"}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
