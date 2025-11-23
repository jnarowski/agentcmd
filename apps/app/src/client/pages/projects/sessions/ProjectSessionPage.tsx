import { useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AgentSessionViewer } from "@/client/components/AgentSessionViewer";
import { ChatPromptInput } from "./components/ChatPromptInput";
import type { PromptInputMessage } from "@/client/components/ai-elements/PromptInput";
import type { FileUIPart } from "ai";
import type { PermissionMode } from "agent-cli-sdk";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import {
  useSessionStore,
  selectTotalTokens,
} from "@/client/pages/projects/sessions/stores/sessionStore";
import { useActiveProject } from "@/client/hooks/navigation";
import { useNavigationStore } from "@/client/stores/index";
import { generateUUID } from "@/client/utils/cn";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { ProjectHeader } from "@/client/pages/projects/components/ProjectHeader";
import { SessionHeader } from "@/client/components/SessionHeader";
import { SessionEventTypes } from "@/shared/types/websocket.types";
import { Channels } from "@/shared/websocket";

export default function ProjectSessionPage() {
  const navigate = useNavigate();
  const params = useParams<{ sessionId: string }>();
  const { projectId } = useActiveProject();
  const sessionId = params.sessionId;

  // Get project and session names for title
  const { data: project } = useProject(projectId!);
  const currentSession = useSessionStore((s) => s.currentSession);

  // Get session for header - convert metadata to SessionResponse-like object
  const sessionForHeader = currentSession?.metadata && sessionId && projectId ? {
    id: sessionId,
    projectId: projectId,
    userId: '', // Not needed for SessionHeader
    name: currentSession.name || currentSession.metadata.firstMessagePreview,
    agent: currentSession.agent || 'claude',
    type: 'chat' as const,
    state: 'idle' as const,
    permission_mode: 'default' as const,
    error_message: currentSession.error || undefined,
    session_path: undefined,
    is_archived: false,
    archived_at: null,
    metadata: currentSession.metadata,
    created_at: new Date(),
    updated_at: new Date(),
  } : null;

  useDocumentTitle(
    project?.name && currentSession?.name
      ? `${currentSession.name} - ${project.name} | Agent Workflows`
      : project?.name
        ? `Chat - ${project.name} | Agent Workflows`
        : undefined
  );
  const setActiveSession = useNavigationStore((s) => s.setActiveSession);

  // Redirect to new session if no sessionId (shouldn't happen with proper routing)
  useEffect(() => {
    if (!sessionId && projectId) {
      navigate(`/projects/${projectId}/sessions/new`, { replace: true });
    }
  }, [sessionId, projectId, navigate]);

  // Get session from store
  const session = useSessionStore((s) => s.currentSession);
  const addMessage = useSessionStore((s) => s.addMessage);
  const setStreaming = useSessionStore((s) => s.setStreaming);
  const totalTokens = useSessionStore(selectTotalTokens);
  const clearHandledPermissions = useSessionStore((s) => s.clearHandledPermissions);
  const clearToolResultError = useSessionStore((s) => s.clearToolResultError);
  const markPermissionHandled = useSessionStore((s) => s.markPermissionHandled);

  // App-wide WebSocket hook (subscription handled by AgentSessionViewer)
  const { isConnected: globalIsConnected, sendMessage: sendWsMessage } = useWebSocket();

  // Send message to session (without subscribing - AgentSessionViewer handles that)
  const wsSendMessage = useCallback(
    (
      message: string,
      images: string[] | undefined,
      config: {
        resume?: boolean;
        sessionId?: string;
        permissionMode?: PermissionMode;
        [key: string]: unknown;
      }
    ) => {
      const channel = Channels.session(sessionId || "");
      sendWsMessage(channel, {
        type: SessionEventTypes.SEND_MESSAGE,
        data: {
          message,
          images,
          config,
        },
      });
    },
    [sessionId, sendWsMessage]
  );

  // Kill/interrupt session
  const killSession = useCallback(() => {
    const channel = Channels.session(sessionId || "");
    const currentSessionId = sessionId || "";

    sendWsMessage(channel, {
      type: SessionEventTypes.KILL_SESSION,
      data: { sessionId: currentSessionId },
    });

    // Update streaming state
    useSessionStore.getState().setStreaming(currentSessionId, false);
  }, [sessionId, sendWsMessage]);

  // Sync sessionId to navigationStore when it changes
  useEffect(() => {
    if (sessionId) {
      setActiveSession(sessionId);
    }
  }, [sessionId, setActiveSession]);

  // Clear handled permissions when session changes
  useEffect(() => {
    clearHandledPermissions();
  }, [sessionId, clearHandledPermissions]);

  const handleSubmit = async (
    { text, files }: PromptInputMessage,
    permissionModeOverride?: PermissionMode
  ) => {
    if (!projectId || !sessionId) {
      console.error("[ProjectSession] No projectId or sessionId available");
      return;
    }

    const message = text || "";

    // Convert images to base64 before sending via WebSocket
    const imagePaths = files ? await handleImageUpload(files) : undefined;

    // Add user message to store immediately
    addMessage(sessionId, {
      id: generateUUID(),
      role: "user",
      content: [{ type: "text", text: message }],
      images: imagePaths,
      timestamp: Date.now(),
      _original: undefined,
      _optimistic: true,
    });

    // Set streaming state immediately to show loading indicator
    setStreaming(sessionId, true);

    // Count assistant messages to determine if we should resume
    const assistantMessageCount =
      session?.messages.filter((m) => m.role === "assistant").length || 0;
    const resume = assistantMessageCount > 0;

    // Get permission mode - use override if provided, otherwise use form value
    const getPermissionMode = useSessionStore.getState().getPermissionMode;
    const permissionMode = permissionModeOverride || getPermissionMode();

    const config = {
      resume,
      sessionId,
      permissionMode,
    };

    wsSendMessage(message, imagePaths, config);
  };

  const handleImageUpload = async (files: FileUIPart[]): Promise<string[]> => {
    // FileUIPart.url is already a blob URL or data URL
    // If it's a blob URL, we need to fetch it and convert to data URL
    return Promise.all(
      files.map(async (fileUIPart) => {
        const url = fileUIPart.url;
        // If already a data URL, return as-is
        if (url.startsWith("data:")) {
          return url;
        }
        // If blob URL, convert to data URL
        if (url.startsWith("blob:")) {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
        // Otherwise return the URL as-is
        return url;
      })
    );
  };

  // Determine if input should be blocked
  // Count assistant messages
  const assistantMessageCount =
    session?.messages.filter((m) => m.role === "assistant").length || 0;
  const waitingForFirstResponse =
    sessionId &&
    assistantMessageCount === 0 &&
    (session?.messages.length || 0) > 0;

  const inputDisabled =
    !globalIsConnected || // Disable if global WebSocket not connected
    Boolean(waitingForFirstResponse); // Block until first assistant response

  // Global Escape key handler for interrupting streaming
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && session?.isStreaming) {
        e.preventDefault();
        killSession();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [session?.isStreaming, killSession]);

  // Permission approval handler
  const handlePermissionApproval = (toolUseId: string) => {
    if (!sessionId) return;
    console.log("[ProjectSession] Permission approved:", toolUseId);

    // Clear the error flag to hide the permission UI immediately
    clearToolResultError(sessionId, toolUseId);

    // Mark as handled to prevent duplicate approvals
    markPermissionHandled(toolUseId);

    // Send follow-up message with acceptEdits permission mode to retry the operation
    handleSubmit({ text: "yes, proceed" }, "acceptEdits");
  };

  return (
    <div
      className="grid h-dvh"
      style={{ gridTemplateRows: "auto auto 1fr auto" }}
    >
      <ProjectHeader
        projectId={projectId!}
        projectName={project?.name || ""}
        projectPath={project?.path || ""}
        gitCapabilities={
          project?.capabilities.git || {
            initialized: false,
            error: null,
            branch: null,
          }
        }
      />
      {sessionForHeader && <SessionHeader session={sessionForHeader} />}
      <div className="overflow-hidden">
        <AgentSessionViewer
          projectId={projectId!}
          sessionId={sessionId!}
          onApprove={handlePermissionApproval}
        />
      </div>
      <div className="sticky bottom-0 z-10 md:pb-4">
        <div className="mx-auto max-w-4xl space-y-4">
          <ChatPromptInput
            onSubmit={handleSubmit}
            disabled={inputDisabled}
            isStreaming={session?.isStreaming || false}
            totalTokens={totalTokens}
            agent={session?.agent}
            onKill={killSession}
          />
        </div>
      </div>
    </div>
  );
}
