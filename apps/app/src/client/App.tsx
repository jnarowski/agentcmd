import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ShellProvider } from "@/client/pages/projects/shell/contexts/ShellContext";
import { WebSocketProvider } from "@/client/providers/WebSocketProvider";
import { DebugPanel } from "@/client/components/debug/DebugPanel";
import ProtectedLayout from "@/client/layouts/ProtectedLayout";
import AuthLayout from "@/client/layouts/AuthLayout";
import ProjectDetailLayout from "@/client/layouts/ProjectDetailLayout";
import WorkflowLayout from "@/client/layouts/WorkflowLayout";
import Projects from "@/client/pages/Projects";
import ProjectHome from "@/client/pages/ProjectHome";
import NewSession from "@/client/pages/projects/sessions/NewSession";
import ProjectSession from "@/client/pages/projects/sessions/ProjectSession";
import ProjectShell from "@/client/pages/projects/shell/ProjectShell";
import ProjectFiles from "@/client/pages/projects/files/ProjectFiles";
import ProjectSourceControl from "@/client/pages/projects/git/ProjectSourceControl";
import { ProjectWorkflowsView } from "@/client/pages/projects/workflows/ProjectWorkflowsView";
import { ProjectWorkflowsManage } from "@/client/pages/projects/workflows/ProjectWorkflowsManage";
import { WorkflowDefinitionView } from "@/client/pages/projects/workflows/WorkflowDefinitionView";
import { WorkflowRunDetail } from "@/client/pages/projects/workflows/WorkflowRunDetail";
import Login from "@/client/pages/auth/Login";
import Signup from "@/client/pages/auth/Signup";
import Components from "@/client/pages/Components";

function AppContent() {
  return (
    <>
      <ShellProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/components" element={<Components />} />

          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* Protected routes with sidebar */}
          <Route element={<ProtectedLayout />}>
            {/* Root redirect to projects */}
            <Route index element={<Navigate to="/projects" replace />} />

            {/* Projects list */}
            <Route path="/projects" element={<Projects />} />

            {/* Project detail with nested routes */}
            <Route path="/projects/:id" element={<ProjectDetailLayout />}>
              <Route index element={<ProjectHome />} />
              <Route
                path="chat"
                element={<Navigate to="session/new" replace />}
              />
              <Route path="session/new" element={<NewSession />} />
              <Route path="session/:sessionId" element={<ProjectSession />} />
              <Route path="shell" element={<ProjectShell />} />
              <Route path="files" element={<ProjectFiles />} />
              <Route path="source-control" element={<ProjectSourceControl />} />
            </Route>
          </Route>

          {/* Workflow routes with dedicated layout (no sidebar) */}
          <Route path="/projects/:projectId" element={<WorkflowLayout />}>
            <Route path="workflows" element={<ProjectWorkflowsView />} />
            <Route path="workflows/manage" element={<ProjectWorkflowsManage />} />
            <Route path="workflows/:definitionId" element={<WorkflowDefinitionView />} />
            <Route path="workflows/:definitionId/runs/:runId" element={<WorkflowRunDetail />} />
          </Route>
        </Routes>
      </ShellProvider>
      <DebugPanel />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <WebSocketProvider>
        <AppContent />
      </WebSocketProvider>
    </BrowserRouter>
  );
}

export default App;
