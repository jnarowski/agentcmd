/**
 * Dialog for creating a pull request
 * Pre-fills title and description from commits
 */

import { useEffect } from 'react';
import { useDialogForm } from '@/client/hooks/useDialogForm';
import { BaseDialog } from '@/client/components/BaseDialog';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/client/components/ui/dialog';
import { Input } from '@/client/components/ui/input';
import { Textarea } from '@/client/components/ui/textarea';
import { Button } from '@/client/components/ui/button';
import { LoadingButton } from '@/client/components/ui/loading-button';
import { Label } from '@/client/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/client/components/ui/select';
import { Alert, AlertDescription } from '@/client/components/ui/alert';
import { ErrorAlert } from '@/client/components/ui/error-alert';
import { Info } from 'lucide-react';
import { Skeleton } from '@/client/components/ui/skeleton';
import { usePrData, useCreatePr } from '@/client/pages/projects/git/hooks/useGitOperations';

interface CreatePullRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  path: string | undefined;
  currentBranch: string | undefined;
}

interface PrFormValues {
  title: string;
  description: string;
  baseBranch: string;
}

export function CreatePullRequestDialog({
  open,
  onOpenChange,
  path,
  currentBranch,
}: CreatePullRequestDialogProps) {
  const {
    values,
    setValues,
    error,
    isSubmitting,
    handleSubmit,
    reset,
  } = useDialogForm<PrFormValues>({
    initialValues: {
      title: '',
      description: '',
      baseBranch: 'main',
    },
    onSubmit: async (formValues) => {
      if (!path) return;
      await createPrMutation.mutateAsync({
        path,
        title: formValues.title,
        description: formValues.description,
        baseBranch: formValues.baseBranch,
      });
      onOpenChange(false);
    },
  });

  // Fetch PR pre-fill data when dialog opens
  const { data: prData, isLoading } = usePrData(path, values.baseBranch, open);

  // Create PR mutation
  const createPrMutation = useCreatePr();

  // Pre-fill form when prData loads
  useEffect(() => {
    if (prData) {
      setValues({
        ...values,
        title: prData.title,
        description: prData.description,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prData]);

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      onClose={reset}
      contentProps={{ className: "sm:max-w-lg" }}
    >
      <DialogHeader>
        <DialogTitle>Create Pull Request</DialogTitle>
        <DialogDescription>
          Create a pull request from{' '}
          <span className="font-mono font-semibold">{currentBranch}</span> to{' '}
          <span className="font-mono font-semibold">{values.baseBranch}</span>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Base Branch Selection */}
        <div className="space-y-2">
          <Label htmlFor="base-branch">Base Branch</Label>
          <Select
            value={values.baseBranch}
            onValueChange={(newBranch) =>
              setValues({ ...values, baseBranch: newBranch })
            }
          >
            <SelectTrigger id="base-branch">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="main">main</SelectItem>
              <SelectItem value="master">master</SelectItem>
              <SelectItem value="develop">develop</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="pr-title">Title</Label>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Input
              id="pr-title"
              placeholder="Pull request title"
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
              disabled={isSubmitting}
            />
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="pr-description">Description</Label>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Textarea
              id="pr-description"
              placeholder="Pull request description"
              value={values.description}
              onChange={(e) =>
                setValues({ ...values, description: e.target.value })
              }
              rows={8}
              disabled={isSubmitting}
              className="font-mono text-sm"
            />
          )}
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This will attempt to create the PR using GitHub CLI (gh). If not available, it will open
            the GitHub compare page in your browser.
          </AlertDescription>
        </Alert>

        <ErrorAlert error={error} />
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <LoadingButton
          onClick={handleSubmit}
          disabled={!values.title.trim() || isLoading}
          isLoading={isSubmitting}
          loadingText="Creating..."
        >
          Create Pull Request
        </LoadingButton>
      </DialogFooter>
    </BaseDialog>
  );
}
