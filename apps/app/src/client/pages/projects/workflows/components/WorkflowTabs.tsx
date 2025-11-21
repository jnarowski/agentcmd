import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { useProjectId } from "@/client/hooks/useProjectId";

export function WorkflowTabs() {
  const projectId = useProjectId();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (location.pathname.includes("/workflows/triggers")) return "triggers";
    if (location.pathname.includes("/workflows/manage")) return "definitions";
    return "runs";
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case "runs":
        navigate(`/projects/${projectId}/workflows`);
        break;
      case "definitions":
        navigate(`/projects/${projectId}/workflows/manage`);
        break;
      case "triggers":
        navigate(`/projects/${projectId}/workflows/triggers`);
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
