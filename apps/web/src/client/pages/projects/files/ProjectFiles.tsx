import { FileTree } from "@/client/pages/projects/files/components/FileTree";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";
import { useProjectsWithSessions } from "@/client/pages/projects/hooks/useProjects";
import { useActiveProject } from "@/client/hooks/navigation";

export default function ProjectFiles() {
  const { projectId } = useActiveProject();
  const { data: projects } = useProjectsWithSessions();
  const project = projects?.find((p) => p.id === projectId);

  useDocumentTitle(project?.name ? `Files - ${project.name} | Agent Workflows` : undefined);

  return <FileTree />;
}
