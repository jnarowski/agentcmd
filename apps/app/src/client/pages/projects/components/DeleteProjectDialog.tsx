import { DeleteDialog } from "@/client/components/DeleteDialog";
import { useDeleteProject } from "@/client/pages/projects/hooks/useProjects";
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
    <DeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Are you sure?"
      description={
        <>
          <p>
            This will permanently delete the project{" "}
            <span className="font-semibold">{project.name}</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            Path: <code className="text-xs">{project.path}</code>
          </p>
          <p className="text-sm font-medium mt-4">
            Note: This only removes the project from the database. The actual
            files on disk will not be deleted.
          </p>
        </>
      }
      onConfirm={handleDelete}
      isPending={deleteMutation.isPending}
    />
  );
}
