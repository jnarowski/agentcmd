import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { useWorkflowDefinitions } from "./hooks/useWorkflowDefinitions";
import { NewRunForm } from "./components/NewRunForm";
import type { WorkflowRun } from "./types";
import { PageHeader } from "@/client/components/PageHeader";
import type { BreadcrumbItem } from "@/client/components/ui/breadcrumb";

export default function NewWorkflowRunPage() {
  const navigate = useNavigate();
  const { projectId, id, definitionId } = useParams();
  const [searchParams] = useSearchParams();
  const activeProjectId = projectId || id;
  const initialSpecFile = searchParams.get("specFile") ?? undefined;
  const initialName = searchParams.get("name") ?? undefined;
  const initialPlanningSessionId = searchParams.get("planningSessionId") ?? undefined;
  const initialSpecInputType = searchParams.get("specInputType") as "file" | "planning" | "content" | undefined;

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

  // Build breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Project", href: `/projects/${activeProjectId}` },
    { label: "Workflows", href: `/projects/${activeProjectId}/workflows` },
  ];

  // Add definition if available
  if (definition) {
    breadcrumbItems.push({
      label: definition.name,
      href: `/projects/${activeProjectId}/workflows/${definitionId}`,
    });
  }

  // Add current page
  breadcrumbItems.push({ label: "New Run" });

  return (
    <div className="flex h-full flex-col">
      <PageHeader breadcrumbs={breadcrumbItems} title="New Workflow Run" />

      <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
        {/* Form */}
        <div className="rounded-lg border bg-card p-6">
          <NewRunForm
            projectId={activeProjectId!}
            definitionId={definitionId}
            definition={definition}
            definitions={definitions}
            initialSpecFile={initialSpecFile}
            initialName={initialName}
            initialPlanningSessionId={initialPlanningSessionId}
            initialSpecInputType={initialSpecInputType}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}
