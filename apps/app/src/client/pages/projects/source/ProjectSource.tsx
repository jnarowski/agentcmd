/**
 * Combined Source page - Files and Git navigation
 */

import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import { FileText, GitBranch } from "lucide-react";
import { FileTree } from "@/client/pages/projects/files/components/FileTree";
import ProjectSourceControl from "@/client/pages/projects/git/ProjectSourceControl";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { useActiveProject } from "@/client/hooks/navigation";

export default function ProjectSource() {
  const { projectId } = useActiveProject();
  const { data: project } = useProject(projectId!);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active view from URL
  const activeView = location.pathname.includes("/source/git") ? "git" : "files";

  useDocumentTitle(
    project?.name ? `Source - ${project.name} | Agent Workflows` : undefined
  );

  const handleNavigation = (view: string) => {
    navigate(`/projects/${projectId}/source/${view}`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Navigation pills */}
      <div className="px-4 pt-4 pb-4 border-b">
        <div className="flex gap-2">
          <Button
            variant={activeView === "files" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleNavigation("files")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Files
          </Button>
          <Button
            variant={activeView === "git" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleNavigation("git")}
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Git
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === "files" && <FileTree />}
        {activeView === "git" && <ProjectSourceControl />}
      </div>
    </div>
  );
}
