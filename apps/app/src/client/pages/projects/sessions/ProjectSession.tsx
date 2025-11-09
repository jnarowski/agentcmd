import { useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { AgentSessionViewer } from "@/client/components/AgentSessionViewer";
import { ChatPromptInput } from "./components/ChatPromptInput";
import type { PromptInputMessage } from "@/client/components/ai-elements/PromptInput";
import type { FileUIPart } from "ai";
import type { PermissionMode } from "agent-cli-sdk";
import { useSessionWebSocket } from "./hooks/useSessionWebSocket";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import {
  useSessionStore,
  selectTotalTokens,
} from "@/client/pages/projects/sessions/stores/sessionStore";
import { useActiveProject } from "@/client/hooks/navigation";
import { useNavigationStore } from "@/client/stores/index";
import { generateUUID } from "@/client/utils/cn";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";
import { useProjectsWithSessions } from "@/client/pages/projects/hooks/useProjects";

export default function ProjectSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ sessionId: string }>();
  const { projectId } = useActiveProject();

  // Get project and session names for title
  const { data: projects } = useProjectsWithSessions();
  const project = projects?.find((p) => p.id === projectId);
  const currentSession = useSessionStore((s) => s.session);

  useDocumentTitle(
    project?.name && currentSession?.name
      ? `${currentSession.name} - ${project.name} | Agent Workflows`
      : project?.name
      ? `Chat - ${project.name} | Agent Workflows`
      : undefined
  );
  const setActiveSession = useNavigationStore((s) => s.setActiveSession);
  const initialMessageSentRef = useRef(false);

  // Get sessionId from URL params (required for this route)
  const sessionId = params.sessionId;

  // Redirect to new session if no sessionId (shouldn't happen with proper routing)
  useEffect(() => {
    if (!sessionId && projectId) {
      navigate(`/projects/${projectId}/sessions/new`, { replace: true });
    }
  }, [sessionId, projectId, navigate]);

  // Get session from store
  const session = useSessionStore((s) => s.session);
  const currentSessionId = useSessionStore((s) => s.sessionId);
  const clearSession = useSessionStore((s) => s.clearSession);
  const addMessage = useSessionStore((s) => s.addMessage);
  const setStreaming = useSessionStore((s) => s.setStreaming);
  const totalTokens = useSessionStore(selectTotalTokens);
  const clearHandledPermissions = useSessionStore((s) => s.clearHandledPermissions);

  // App-wide WebSocket hook for connection status
  const { isConnected: globalIsConnected } = useWebSocket();

  // WebSocket hook (subscribes to session events)
  const { sendMessage: wsSendMessage, killSession } = useSessionWebSocket({
    sessionId: sessionId || "",
    projectId: projectId || "",
  });

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

  // Handle query parameter for initial message
  useEffect(() => {
    if (!sessionId || !projectId) {
      return;
    }

    // Check if we have a query parameter (indicates message already sent)
    const searchParams = new URLSearchParams(location.search);
    const queryParam = searchParams.get("query");

    if (queryParam) {
      // Initialize session in store without fetching from server (only if not already initialized)
      if (currentSessionId !== sessionId) {
        clearSession();
        // Get current agent from store
        const currentAgent = useSessionStore.getState().getAgent();
        // Manually initialize the session store for this new session
        useSessionStore.setState({
          sessionId: sessionId,
          session: {
            id: sessionId,
            agent: currentAgent, // Use agent from store
            messages: [],
            isStreaming: false,
            metadata: null,
            loadingState: "loaded",
            error: null,
          },
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, projectId, currentSessionId, location.search]);

  // Reset initialMessageSentRef when navigating to a different session
  useEffect(() => {
    initialMessageSentRef.current = false;
  }, [sessionId]);

  // Handle initial message from query parameter
  useEffect(() => {
    if (!sessionId || initialMessageSentRef.current) {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const queryParam = searchParams.get("query");

    if (queryParam) {
      initialMessageSentRef.current = true;

      try {
        const decodedMessage = decodeURIComponent(queryParam);

        // Add the user message to the store for UI display
        // (Message was already sent via WebSocket during session creation)
        addMessage({
          id: generateUUID(),
          role: "user",
          content: [{ type: "text", text: decodedMessage }],
          timestamp: Date.now(),
          _original: undefined,
        });

        // Set streaming state to show loading indicator
        setStreaming(true);

        // Remove only the query parameter, preserve others like debug
        const searchParams = new URLSearchParams(location.search);
        searchParams.delete('query');
        const newSearch = searchParams.toString();
        navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true });
      } catch (error) {
        console.error(
          "[ProjectSession] Error processing query parameter:",
          error
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, location.search]);

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
    addMessage({
      id: generateUUID(),
      role: "user",
      content: [{ type: "text", text: message }],
      images: imagePaths,
      timestamp: Date.now(),
      _original: undefined,
    });

    // Set streaming state immediately to show loading indicator
    setStreaming(true);

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
        if (url.startsWith('data:')) {
          return url;
        }
        // If blob URL, convert to data URL
        if (url.startsWith('blob:')) {
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

  // Permission approval handler
  const handlePermissionApproval = (toolUseId: string) => {
    console.log('[ProjectSession] Permission approved:', toolUseId);
    // Send follow-up message with acceptEdits permission mode to retry the operation
    handleSubmit({ text: 'yes, proceed' }, 'acceptEdits');
  };

  // Only auto-load if no query parameter (AgentSessionViewer handles loading)
  const searchParams = new URLSearchParams(location.search);
  const hasQueryParam = searchParams.has("query");

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Chat Messages Container - takes up remaining space */}
      <div className="flex-1 overflow-hidden">
        <AgentSessionViewer
          projectId={projectId!}
          sessionId={sessionId!}
          autoLoad={!hasQueryParam} // Don't auto-load if query param present
          onApprove={handlePermissionApproval}
        />
      </div>

      {/* Fixed Input Container at Bottom */}
      <div className="md:pb-4 md:px-4">
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
