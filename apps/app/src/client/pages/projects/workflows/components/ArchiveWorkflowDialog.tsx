import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/client/components/ui/alert-dialog";

interface ArchiveWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowName: string;
  runCount: number;
  onConfirm: () => void;
  isPending: boolean;
}

export function ArchiveWorkflowDialog({
  open,
  onOpenChange,
  workflowName,
  runCount,
  onConfirm,
  isPending,
}: ArchiveWorkflowDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Workflow</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to archive "{workflowName}"?
            {runCount > 0 && (
              <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                Warning: This workflow has {runCount} active or pending run{runCount > 1 ? 's' : ''}.
                Archiving will not affect existing runs, but you won't be able to create new runs until it's unarchived.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Archiving...' : 'Archive'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
