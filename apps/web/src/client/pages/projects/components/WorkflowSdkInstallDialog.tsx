/**
 * WorkflowSdkInstallDialog Component
 * Dialog for installing workflow-sdk in a project
 */

import { useState } from 'react';
import { Loader2, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/client/components/ui/dialog';
import { Button } from '@/client/components/ui/button';
import { Alert, AlertDescription } from '@/client/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/client/components/ui/tabs';
import {
  useWorkflowSdkCheck,
  useInstallWorkflowSdk,
} from '@/client/pages/projects/hooks/useProjects';

interface WorkflowSdkInstallDialogProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkflowSdkInstallDialog({
  projectId,
  isOpen,
  onClose,
}: WorkflowSdkInstallDialogProps) {
  const { data: checkResult, refetch } = useWorkflowSdkCheck(projectId);
  const installMutation = useInstallWorkflowSdk();
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('npm');

  const handleInstall = async () => {
    await installMutation.mutateAsync(projectId);
    await refetch();
    onClose();
  };

  const handleCopy = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const commands = {
    npm: 'npm install --save-dev @repo/workflow-sdk && npx workflow-sdk init --yes',
    pnpm: 'pnpm add -D @repo/workflow-sdk && pnpm workflow-sdk init --yes',
    yarn: 'yarn add -D @repo/workflow-sdk && yarn workflow-sdk init --yes',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install Workflow SDK</DialogTitle>
          <DialogDescription>
            {!checkResult?.hasPackageJson
              ? 'No package.json found. The installation will create one for you.'
              : 'Install workflow-sdk to enable workflow run in this project.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!checkResult?.hasPackageJson && (
            <Alert>
              <AlertDescription>
                No package.json found. Click "Install Now" to create a package.json
                and install workflow-sdk automatically.
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
                'Install Now'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={installMutation.isPending}
            >
              Re-check
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={installMutation.isPending}
            >
              Close
            </Button>
          </div>

          {installMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                {installMutation.error?.message || 'Installation failed'}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
