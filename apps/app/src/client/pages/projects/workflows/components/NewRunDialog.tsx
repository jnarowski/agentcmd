import { useNavigate } from "react-router-dom";
import { BaseDialog } from "@/client/components/BaseDialog";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import type { WorkflowDefinition, WorkflowRun } from "@/client/pages/projects/workflows/types";
import { NewRunForm } from "./NewRunForm";

interface NewRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  definitionId: string;
  definition?: WorkflowDefinition;
  definitions?: WorkflowDefinition[];
}

export function NewRunDialog({
  open,
  onOpenChange,
  projectId,
  definitionId,
  definition,
  definitions,
}: NewRunDialogProps) {
  const navigate = useNavigate();

  // Derive actual definition for dialog header
  const actualDefinition = definition || definitions?.find((d) => d.id === definitionId);

  const handleSuccess = (run: WorkflowRun) => {
    // Navigate to new run
    navigate(
      `/projects/${projectId}/workflows/${run.workflow_definition_id}/runs/${run.id}`
    );
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      contentProps={{ className: "sm:max-w-[650px]", noPadding: true }}
    >
      <DialogHeader className="px-6 pt-6 pb-4 border-b">
        <DialogTitle className="text-2xl">New Workflow Run</DialogTitle>
        <DialogDescription className="text-base">
          {actualDefinition
            ? `Create a new run of "${actualDefinition.name}"`
            : "Create a new workflow run"}
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[60vh] overflow-y-auto">
        <NewRunForm
          projectId={projectId}
          definitionId={definitionId}
          definition={definition}
          definitions={definitions}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </BaseDialog>
  );
}
