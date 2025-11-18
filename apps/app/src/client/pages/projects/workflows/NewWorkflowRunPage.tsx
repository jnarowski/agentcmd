import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { useWorkflowDefinitions } from "./hooks/useWorkflowDefinitions";
import { NewRunForm } from "./components/NewRunForm";
import type { WorkflowRun } from "./types";

export default function NewWorkflowRunPage() {
  const navigate = useNavigate();
  const { projectId, id, definitionId } = useParams();
  const [searchParams] = useSearchParams();
  const activeProjectId = projectId || id;
  const initialSpecFile = searchParams.get("specFile") ?? undefined;
  const initialName = searchParams.get("name") ?? undefined;

  // Get project name for title
  const { data: project } = useProject(activeProjectId!);
  useDocumentTitle(
    project?.name
      ? `New Workflow Run - ${project.name} | Agent Workflows`
      : undefined
  );

  // Fetch workflow definitions
  // If URL has definitionId, fetch all (including archived) to ensure it's included
  // Otherwise fetch active only
  const { data: definitions } = useWorkflowDefinitions(
    activeProjectId || "",
    definitionId ? undefined : "active"
  );

  // Find specific definition if definitionId provided
  const definition = definitionId
    ? definitions?.find((d) => d.id === definitionId)
    : undefined;

  const handleSuccess = (run: WorkflowRun) => {
    // Navigate to run detail
    navigate(
      `/projects/${activeProjectId}/workflows/${run.workflow_definition_id}/runs/${run.id}`
    );
  };

  const handleCancel = () => {
    // Navigate back to workflows list
    navigate(`/projects/${activeProjectId}/workflows/manage`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold">New Workflow Run</h1>
        </div>
      </div>

      {/* Form container */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg border bg-card p-6">
            <NewRunForm
              projectId={activeProjectId!}
              definitionId={definitionId}
              definition={definition}
              definitions={definitions}
              initialSpecFile={initialSpecFile}
              initialName={initialName}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
