import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ShellProvider } from "@/client/pages/projects/shell/contexts/ShellContext";
import { WebSocketProvider } from "@/client/providers/WebSocketProvider";
import { DebugPanel } from "@/client/components/debug/DebugPanel";
import ProtectedLayout from "@/client/layouts/ProtectedLayout";
import AuthLayout from "@/client/layouts/AuthLayout";
import ProjectDetailLayout from "@/client/layouts/ProjectDetailLayout";
import WorkflowLayout from "@/client/layouts/WorkflowLayout";
import ProjectsPage from "@/client/pages/ProjectsPage";
import ProjectHomePage from "@/client/pages/ProjectHomePage";
import NewSessionPage from "@/client/pages/projects/sessions/NewSessionPage";
import ProjectSessionPage from "@/client/pages/projects/sessions/ProjectSessionPage";
import ProjectShellPage from "@/client/pages/projects/shell/ProjectShellPage";
import ProjectSourcePage from "@/client/pages/projects/source/ProjectSourcePage";
import ProjectWorkflowsPage from "@/client/pages/projects/workflows/ProjectWorkflowsPage";
import ProjectWorkflowsListPage from "@/client/pages/projects/workflows/ProjectWorkflowsListPage";
import ProjectWorkflowsManagePage from "@/client/pages/projects/workflows/ProjectWorkflowsManagePage";
import ProjectWorkflowsOnboardingPage from "@/client/pages/projects/workflows/ProjectWorkflowsOnboardingPage";
import WorkflowDefinitionPage from "@/client/pages/projects/workflows/WorkflowDefinitionPage";
import WorkflowRunDetailPage from "@/client/pages/projects/workflows/WorkflowRunDetailPage";
import NewWorkflowRunPage from "@/client/pages/projects/workflows/NewWorkflowRunPage";
import LoginPage from "@/client/pages/auth/LoginPage";
import SignupPage from "@/client/pages/auth/SignupPage";
import ComponentsPage from "@/client/pages/ComponentsPage";

function AppContent() {
  return (
    <>
      <ShellProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/components" element={<ComponentsPage />} />

          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          {/* Protected routes with sidebar */}
          <Route element={<ProtectedLayout />}>
            {/* Root redirect to projects */}
            <Route index element={<Navigate to="/projects" replace />} />

            {/* Projects list */}
            <Route path="/projects" element={<ProjectsPage />} />

            {/* Project detail with nested routes */}
            <Route path="/projects/:id" element={<ProjectDetailLayout />}>
              <Route index element={<ProjectHomePage />} />
              <Route
                path="chat"
                element={<Navigate to="sessions/new" replace />}
              />
              <Route path="sessions/new" element={<NewSessionPage />} />
              <Route path="sessions/:sessionId" element={<ProjectSessionPage />} />
              <Route path="shell" element={<ProjectShellPage />} />
              <Route path="source" element={<Navigate to="source/files" replace />} />
              <Route path="source/files" element={<ProjectSourcePage />} />
              <Route path="source/git" element={<ProjectSourcePage />} />
            </Route>
          </Route>

          {/* Workflow routes with dedicated layout (no sidebar) */}
          <Route path="/projects/:projectId" element={<WorkflowLayout />}>
            <Route path="workflows" element={<ProjectWorkflowsPage />} />
            <Route path="workflows/list" element={<ProjectWorkflowsListPage />} />
            <Route path="workflows/onboarding" element={<ProjectWorkflowsOnboardingPage />} />
            <Route path="workflows/manage" element={<ProjectWorkflowsManagePage />} />
            <Route path="workflows/new" element={<NewWorkflowRunPage />} />
            <Route path="workflows/:definitionId/new" element={<NewWorkflowRunPage />} />
            <Route path="workflows/:definitionId" element={<WorkflowDefinitionPage />} />
            <Route path="workflows/:definitionId/runs/:runId" element={<WorkflowRunDetailPage />} />
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
