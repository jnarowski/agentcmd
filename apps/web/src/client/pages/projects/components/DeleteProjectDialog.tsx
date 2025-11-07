import { useDeleteProject } from "@/client/pages/projects/hooks/useProjects";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/client/components/ui/alert-dialog";
import { LoadingButton } from "@/client/components/ui/loading-button";
import type { Project } from "@/shared/types/project.types";

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSuccess?: () => void;
}

export function DeleteProjectDialog({
  open,
  onOpenChange,
  project,
  onSuccess,
}: DeleteProjectDialogProps) {
  const deleteMutation = useDeleteProject();

  const handleDelete = () => {
    deleteMutation.mutate(project.id, {
      onSuccess: () => {
        onOpenChange(false);
        onSuccess?.();
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will permanently delete the project{" "}
              <span className="font-semibold">{project.name}</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Path: <code className="text-xs">{project.path}</code>
            </p>
            <p className="text-sm font-medium mt-4">
              Note: This only removes the project from the database. The actual files on
              disk will not be deleted.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <LoadingButton
            onClick={handleDelete}
            isLoading={deleteMutation.isPending}
            loadingText="Deleting..."
            variant="destructive"
          >
            Delete
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
