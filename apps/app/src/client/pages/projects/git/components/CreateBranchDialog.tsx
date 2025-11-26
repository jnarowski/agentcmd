/**
 * Dialog for creating a new git branch
 * Validates branch name and provides feedback
 */

import { useDialogForm } from '@/client/hooks/useDialogForm';
import { BaseDialog } from '@/client/components/BaseDialog';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/client/components/ui/dialog';
import { Input } from '@/client/components/ui/input';
import { Button } from '@/client/components/ui/button';
import { LoadingButton } from '@/client/components/ui/loading-button';
import { Label } from '@/client/components/ui/label';
import { Alert, AlertDescription } from '@/client/components/ui/alert';
import { ErrorAlert } from '@/client/components/ui/error-alert';
import { AlertCircle } from 'lucide-react';

interface CreateBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBranch: string | undefined;
  onCreateBranch: (name: string, from?: string) => Promise<void>;
}

interface BranchFormValues {
  branchName: string;
}

export function CreateBranchDialog({
  open,
  onOpenChange,
  currentBranch,
  onCreateBranch,
}: CreateBranchDialogProps) {
  const {
    values,
    setValues,
    error,
    isSubmitting,
    handleSubmit,
    reset,
  } = useDialogForm<BranchFormValues>({
    initialValues: { branchName: '' },
    onSubmit: async (formValues) => {
      await onCreateBranch(formValues.branchName, currentBranch);
      onOpenChange(false);
    },
  });

  // Validate branch name (no spaces, only alphanumeric, dash, underscore)
  const validateBranchName = (name: string): boolean => {
    if (!name) return false;
    // Allow alphanumeric, dash, underscore, forward slash (for feature/xyz)
    const validPattern = /^[a-zA-Z0-9/_-]+$/;
    return validPattern.test(name);
  };

  const isValid = validateBranchName(values.branchName);

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      onClose={reset}
      contentProps={{ className: "sm:max-w-md" }}
    >
      <DialogHeader>
        <DialogTitle>Create New Branch</DialogTitle>
        <DialogDescription>
          Create a new branch from <span className="font-mono font-semibold">{currentBranch}</span>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="branch-name">Branch Name</Label>
          <Input
            id="branch-name"
            placeholder="feature/my-new-feature"
            value={values.branchName}
            onChange={(e) => setValues({ branchName: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid && !isSubmitting) {
                handleSubmit();
              }
            }}
            disabled={isSubmitting}
            autoFocus
          />
          {values.branchName && !isValid && (
            <p className="text-sm text-destructive">
              Branch name can only contain letters, numbers, dashes, underscores, and forward slashes
            </p>
          )}
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Any uncommitted changes will be automatically committed before creating the new branch.
            You will then automatically switch to the new branch.
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
          disabled={!isValid}
          isLoading={isSubmitting}
          loadingText="Creating..."
        >
          Create Branch
        </LoadingButton>
      </DialogFooter>
    </BaseDialog>
  );
}
