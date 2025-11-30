import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ShellProvider } from "@/client/pages/projects/shell/contexts/ShellContext";
import { WebSocketProvider } from "@/client/providers/WebSocketProvider";
import { DebugPanel } from "@/client/components/debug/DebugPanel";
import AppLayout from "@/client/layouts/AppLayout";
import AuthLayout from "@/client/layouts/AuthLayout";
import ProjectLoader from "@/client/layouts/ProjectLoader";
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
import ProjectEditPage from "@/client/pages/projects/ProjectEditPage";
import ProjectWebhooksPage from "@/client/pages/projects/webhooks/ProjectWebhooksPage";
import WebhookFormPage from "@/client/pages/projects/webhooks/WebhookFormPage";
import WebhookDetailPage from "@/client/pages/projects/webhooks/WebhookDetailPage";
import SpecPreviewPage from "@/client/pages/projects/specs/SpecPreviewPage";
import LoginPage from "@/client/pages/auth/LoginPage";
import SignupPage from "@/client/pages/auth/SignupPage";
import ComponentsPage from "@/client/pages/ComponentsPage";
import { ChatLayoutMock } from "@/client/pages/mock/ChatLayoutMock";

function AppContent() {
  return (
    <>
      <ShellProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/components" element={<ComponentsPage />} />
          <Route path="/mock/chat-layout" element={<ChatLayoutMock />} />

          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          {/* Protected routes with sidebar */}
          <Route element={<AppLayout />}>
            {/* Root redirect to projects */}
            <Route index element={<Navigate to="/projects" replace />} />

            {/* Projects list */}
            <Route path="/projects" element={<ProjectsPage />} />

            {/* All project routes (detail + workflows) */}
            <Route path="/projects/:id" element={<ProjectLoader />}>
              <Route index element={<ProjectHomePage />} />
              <Route path="settings" element={<ProjectEditPage />} />
              <Route
                path="chat"
                element={<Navigate to="sessions/new" replace />}
              />
              <Route path="sessions/new" element={<NewSessionPage />} />
              <Route path="sessions/:sessionId" element={<ProjectSessionPage />} />
              <Route path="specs/:specId" element={<SpecPreviewPage />} />
              <Route path="shell" element={<ProjectShellPage />} />
              <Route path="source" element={<Navigate to="source/files" replace />} />
              <Route path="source/files" element={<ProjectSourcePage />} />
              <Route path="source/git" element={<ProjectSourcePage />} />
              <Route path="workflows" element={<ProjectWorkflowsPage />} />
              <Route path="workflows/list" element={<ProjectWorkflowsListPage />} />
              <Route path="workflows/onboarding" element={<ProjectWorkflowsOnboardingPage />} />
              <Route path="workflows/manage" element={<ProjectWorkflowsManagePage />} />
              <Route path="workflows/new" element={<NewWorkflowRunPage />} />
              <Route path="workflows/:definitionId/new" element={<NewWorkflowRunPage />} />
              <Route path="workflows/:definitionId" element={<WorkflowDefinitionPage />} />
              <Route path="workflows/:definitionId/runs/:runId" element={<WorkflowRunDetailPage />} />
              <Route path="workflows/triggers" element={<ProjectWebhooksPage />} />
              <Route path="workflows/triggers/new" element={<WebhookFormPage />} />
              <Route path="workflows/triggers/:webhookId" element={<WebhookDetailPage />} />
              <Route path="workflows/triggers/:webhookId/edit" element={<WebhookFormPage />} />
            </Route>
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
