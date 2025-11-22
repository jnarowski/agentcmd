import { DeleteDialog } from "@/client/components/DeleteDialog";
import { useDeleteWorkflowRun } from "../hooks/useWorkflowMutations";
import type { WorkflowRun } from "../types";

interface DeleteWorkflowRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: WorkflowRun;
  onSuccess?: () => void;
}

export function DeleteWorkflowRunDialog({
  open,
  onOpenChange,
  run,
  onSuccess,
}: DeleteWorkflowRunDialogProps) {
  const deleteMutation = useDeleteWorkflowRun();

  const handleDelete = () => {
    deleteMutation.mutate(run.id, {
      onSuccess: () => {
        onSuccess?.();
        onOpenChange(false);
      },
    });
  };

  return (
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete workflow run?"
      description={
        <>
          <div>
            This will permanently delete the workflow run{" "}
            <span className="font-semibold">{run.name}</span>.
          </div>
          <div className="text-sm text-muted-foreground">
            All steps, events, and artifacts will be removed.
          </div>
        </>
      }
      onConfirm={handleDelete}
      isPending={deleteMutation.isPending}
    />
  );
}
