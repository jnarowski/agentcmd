/**
 * Dialog for editing session name
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
import { ErrorAlert } from '@/client/components/ui/error-alert';
import type { SessionResponse } from '@/shared/types';
import { getSessionDisplayName } from '@/client/utils/getSessionDisplayName';

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionResponse | null;
  onUpdateSession: (sessionId: string, name: string) => Promise<void>;
}

interface SessionFormValues {
  name: string;
}

export function SessionDialog({
  open,
  onOpenChange,
  session,
  onUpdateSession,
}: SessionDialogProps) {
  const {
    values,
    setValues,
    error,
    isSubmitting,
    handleSubmit,
    reset,
  } = useDialogForm<SessionFormValues>({
    initialValues: {
      name: session ? getSessionDisplayName(session) : '',
    },
    onSubmit: async (formValues) => {
      if (!session) return;
      await onUpdateSession(session.id, formValues.name);
      onOpenChange(false);
    },
  });

  const isValid = values.name.trim().length > 0;

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      onClose={reset}
      contentProps={{ className: "sm:max-w-md" }}
    >
      <DialogHeader>
        <DialogTitle>Edit Session Name</DialogTitle>
        <DialogDescription>
          Change the display name for this session
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="session-name">Session Name</Label>
          <Input
            id="session-name"
            placeholder="Enter session name"
            value={values.name}
            onChange={(e) => setValues({ name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid && !isSubmitting) {
                handleSubmit();
              }
            }}
            disabled={isSubmitting}
            autoFocus
          />
          {values.name && !isValid && (
            <p className="text-sm text-destructive">
              Session name cannot be empty
            </p>
          )}
        </div>

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
          loadingText="Saving..."
        >
          Save
        </LoadingButton>
      </DialogFooter>
    </BaseDialog>
  );
}
