import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/client/components/ui/tabs";

export function WorkflowTabs() {
  const { projectId, id } = useParams<{ projectId?: string; id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Use projectId or id (depending on route structure)
  const activeProjectId = projectId || id;

  if (!activeProjectId) return null;

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (location.pathname.includes("/workflows/triggers")) return "triggers";
    if (location.pathname.includes("/workflows/manage")) return "definitions";
    return "runs";
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case "runs":
        navigate(`/projects/${activeProjectId}/workflows`);
        break;
      case "definitions":
        navigate(`/projects/${activeProjectId}/workflows/manage`);
        break;
      case "triggers":
        navigate(`/projects/${activeProjectId}/workflows/triggers`);
        break;
    }
  };

  return (
    <Tabs value={getActiveTab()} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="runs">Dashboard</TabsTrigger>
        <TabsTrigger value="definitions">Definitions</TabsTrigger>
        <TabsTrigger value="triggers">Triggers</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
