import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { useProjectId } from "@/client/hooks/useProjectId";
import { ProjectEditForm } from "./components/ProjectEditForm";
import { PageHeader } from "@/client/components/PageHeader";
import type { BreadcrumbItem } from "@/client/components/ui/breadcrumb";
import { Skeleton } from "@/client/components/ui/skeleton";

export default function ProjectEditPage() {
  const navigate = useNavigate();
  const projectId = useProjectId();

  // Get project data
  const { data: project, isLoading } = useProject(projectId);

  useDocumentTitle(
    project?.name
      ? `Edit Project - ${project.name} | Agent Workflows`
      : undefined
  );

  const handleSuccess = () => {
    // Navigate back to project home
    navigate(`/projects/${projectId}`);
  };

  const handleCancel = () => {
    // Navigate back to project home
    navigate(`/projects/${projectId}`);
  };

  // Build breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: project?.name || "Project", href: `/projects/${projectId}` },
    { label: "Settings" },
  ];

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader breadcrumbs={breadcrumbItems} title="Project Settings" />
        <div className="flex-1 overflow-auto space-y-6 md:p-6">
          <div className="md:bg-card md:rounded-lg md:border p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-48 mt-6" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader breadcrumbs={breadcrumbItems} title="Project Settings" />
        <div className="flex-1 overflow-auto md:p-6">
          <div className="md:bg-card md:rounded-lg md:border p-6">
            <p className="text-muted-foreground">Project not found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader breadcrumbs={breadcrumbItems} title="Project Settings" />

      <div className="flex-1 overflow-auto space-y-6 md:p-6">
        {/* Form */}
        <div className="md:bg-card md:rounded-lg md:border">
          <ProjectEditForm
            project={project}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}
