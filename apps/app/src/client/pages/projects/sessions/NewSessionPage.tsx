import { useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChatPromptInput,
  type ChatPromptInputHandle,
} from "./components/ChatPromptInput";
import type { PromptInputMessage } from "@/client/components/ai-elements/PromptInput";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import { useActiveProject } from "@/client/hooks/navigation";
import { api } from "@/client/utils/api";
import { sessionKeys } from "./hooks/queryKeys";
import { useProject } from "@/client/pages/projects/hooks/useProjects";
import { generateUUID } from "@/client/utils/cn";
import { AgentSelector } from "@/client/components/AgentSelector";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";
import { Channels } from "@/shared/websocket";
import { SessionEventTypes } from "@/shared/types/websocket.types";
import { useSettings } from "@/client/hooks/useSettings";
import type { PermissionMode } from "agent-cli-sdk";

export default function NewSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projectId } = useActiveProject();
  const queryClient = useQueryClient();
  const chatInputRef = useRef<ChatPromptInputHandle>(null);

  // Get project name for title
  const { data: project } = useProject(projectId!);
  useDocumentTitle(project?.name ? `New Session - ${project.name} | Agent Workflows` : undefined);

  // Get agent from store
  const agent = useSessionStore((s) => s.form.agent);
  const setAgent = useSessionStore((s) => s.setAgent);
  const setPermissionMode = useSessionStore((s) => s.setPermissionMode);
  const initializeFromSettings = useSessionStore((s) => s.initializeFromSettings);

  // Load user settings to reset form to defaults
  const { data: settings } = useSettings();

  // Reset form to user defaults on every mount (not just settings change)
  // This ensures navigating from existing session → /new resets to defaults
  // Also check for mode query parameter to override defaults
  useEffect(() => {
    if (settings?.userPreferences) {
      initializeFromSettings({
        permissionMode: settings.userPreferences.default_permission_mode || "acceptEdits",
        agent: settings.userPreferences.default_agent,
      });
    }

    // Check for mode query parameter and override if present
    const modeParam = searchParams.get('mode');
    if (modeParam && ['default', 'plan', 'acceptEdits', 'bypassPermissions'].includes(modeParam)) {
      setPermissionMode(modeParam as PermissionMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  // App-wide WebSocket hook for sending messages during session creation
  const {
    sendMessage: globalSendMessage,
    isConnected: globalIsConnected,
  } = useWebSocket();

  // Auto-focus input on mount
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleSubmit = async ({ text }: PromptInputMessage) => {
    if (!projectId) {
      console.error("[NewSession] No projectId available");
      return;
    }

    const message = text || "";

    try {
      // Get current agent and permission mode from store
      const agent = useSessionStore.getState().getAgent();
      const getPermissionMode = useSessionStore.getState().getPermissionMode;
      const permissionMode = getPermissionMode() || "acceptEdits";

      // Create session via API
      const { data: newSession } = await api.post<{ data: { id: string } }>(
        `/api/projects/${projectId}/sessions`,
        { sessionId: generateUUID(), agent, permission_mode: permissionMode }
      );

      // Invalidate all session lists to update sidebar immediately
      queryClient.invalidateQueries({
        queryKey: sessionKeys.lists(),
      });

      // No image upload for now - files parameter not used
      const imagePaths = undefined;

      // Initialize session in store with optimistic message
      // This prevents AgentSessionViewer from fetching when it mounts
      useSessionStore.setState({
        sessionId: newSession.id,
        session: {
          id: newSession.id,
          name: undefined,
          agent,
          type: 'chat', // Default to chat type for new sessions
          permission_mode: permissionMode,
          messages: [{
            id: generateUUID(),
            role: "user",
            content: [{ type: "text", text: message }],
            timestamp: Date.now(),
            _original: undefined,
          }],
          isStreaming: true, // Show loading indicator immediately
          metadata: null,
          loadingState: "loaded",
          error: null,
        },
      });

      // Immediately send message via app-wide WebSocket (after store setup)
      // This starts the assistant processing right away
      // New session = resume: false (no prior messages)
      globalSendMessage(Channels.session(newSession.id), {
        type: SessionEventTypes.SEND_MESSAGE,
        data: {
          message,
          images: imagePaths,
          config: {
            resume: false,
            sessionId: newSession.id,
            permissionMode,
          },
        },
      });

      // Navigate to the new session without query param
      navigate(
        `/projects/${projectId}/sessions/${newSession.id}`,
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error("[NewSession] Error creating session:", error);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Empty state - chat starts here */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div className="text-center space-y-4 max-w-2xl w-full">
          <h2 className="text-2xl font-semibold">Start a New Session</h2>
          <AgentSelector value={agent} onChange={setAgent} />
        </div>
      </div>

      {/* Fixed Input Container at Bottom */}
      <div className="md:pb-4 md:px-4">
        <div className="mx-auto max-w-4xl space-y-4">
          <ChatPromptInput
            ref={chatInputRef}
            onSubmit={handleSubmit}
            disabled={!globalIsConnected}
            isStreaming={false}
            totalTokens={0}
            agent={agent}
          />
        </div>
      </div>
    </div>
  );
}
