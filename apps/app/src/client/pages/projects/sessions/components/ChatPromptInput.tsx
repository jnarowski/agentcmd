"use client";

import {
  PromptInput,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputProvider,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputController,
} from "@/client/components/ai-elements/PromptInput";
import type { PromptInputMessage } from "@/client/components/ai-elements/PromptInput";
import { useAgentCapabilities } from "@/client/hooks/useSettings";
import { ChatPromptInputFiles } from "./ChatPromptInputFiles";
import { ChatPromptInputSlashCommands } from "./ChatPromptInputSlashCommands";
import { PermissionModeSelector } from "./PermissionModeSelector";
import { ModelSelector } from "./ModelSelector";
import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import { useNavigationStore } from "@/client/stores/navigationStore";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import type { AgentType } from "@/shared/types/agent.types";
import { useActiveProject } from "@/client/hooks/navigation/useActiveProject";
import { cn } from "@/client/utils/cn";
import { TokenUsageCircle } from "./TokenUsageCircle";
import { usePromptInputState } from "../hooks/usePromptInputState";
import { useWebSocket } from "@/client/hooks/useWebSocket";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/client/components/ui/tooltip";

interface ChatPromptInputProps {
  onSubmit?: (message: PromptInputMessage) => void | Promise<void>;
  disabled?: boolean;
  isStreaming?: boolean;
  totalTokens?: number; // Total session tokens
  currentMessageTokens?: number; // Current message tokens (to be added)
  agent?: AgentType; // Override agent (for /new page before session is created)
  onKill?: () => void;
}

export interface ChatPromptInputHandle {
  focus: () => void;
}

// Inner component that uses the controller
const ChatPromptInputInner = forwardRef<
  ChatPromptInputHandle,
  ChatPromptInputProps
>(
  (
    {
      onSubmit,
      disabled = false,
      isStreaming: externalIsStreaming = false,
      totalTokens,
      currentMessageTokens,
      agent: agentProp,
      onKill,
    },
    ref
  ) => {
    const controller = usePromptInputController();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Get WebSocket connection status
    const { isConnected } = useWebSocket();

    // Get active project and session IDs from navigation store
    const { activeProjectId } = useNavigationStore();
    const { project } = useActiveProject();

    // Session store for permission modes, model, and agent type
    const permissionMode = useSessionStore((s) => s.form.permissionMode);
    const setPermissionMode = useSessionStore((s) => s.setPermissionMode);
    const model = useSessionStore((s) => s.form.model);
    const setModel = useSessionStore((s) => s.setModel);
    const sessionAgent = useSessionStore((s) => s.session?.agent);
    const formAgent = useSessionStore((s) => s.form.agent);

    // Use agent prop if provided, otherwise fall back to session agent, then form agent
    const agent = agentProp || sessionAgent || formAgent;

    // Get agent capabilities from settings (with fallback while loading)
    const capabilities = useAgentCapabilities(agent) ?? {
      supportsSlashCommands: false,
      supportsModels: false,
      models: [],
    };

    // Use first model as default if no model selected or current model invalid
    const currentModel = useMemo(() => {
      if (capabilities.models.length === 0) return "";

      // Check if stored model is valid for current agent
      const isValidModel = model && capabilities.models.some((m) => m.id === model);

      // Use stored model if valid, otherwise use first available model
      return isValidModel ? (model ?? "") : capabilities.models[0].id;
    }, [model, capabilities.models]);

    // Use the extracted state hook
    const {
      status,
      setStatus,
      isAtMenuOpen,
      setIsAtMenuOpen,
      isSlashMenuOpen,
      setIsSlashMenuOpen,
      handleTextChange,
      handleKeyDown,
      handleFileSelect,
      handleFileRemove,
      handleCommandSelect,
      handleSubmit,
      text,
    } = usePromptInputState({
      controller,
      permissionMode,
      onPermissionModeChange: setPermissionMode,
      textareaRef,
      disabled,
      onSubmit,
    });

    // Expose focus method to parent components
    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
    }));

    // Update status based on external streaming state
    useEffect(() => {
      if (externalIsStreaming) {
        setStatus("streaming");
      } else if (status === "streaming") {
        setStatus("ready");
      }
    }, [externalIsStreaming, status, setStatus]);

    return (
      <div className="flex flex-col justify-end size-full">
        <PromptInput
          globalDrop
          multiple
          onSubmit={handleSubmit}
          inputGroupClassName={cn(
            "pb-2 md:pb-0",
            "transition-colors",
            permissionMode === "plan" &&
              "border-green-500 md:has-[[data-slot=input-group-control]:focus-visible]:border-green-500",
            permissionMode === "acceptEdits" &&
              "border-purple-500 md:has-[[data-slot=input-group-control]:focus-visible]:border-purple-500",
            permissionMode === "bypassPermissions" &&
              "border-red-500 md:has-[[data-slot=input-group-control]:focus-visible]:border-red-500"
          )}
        >
          <PromptInputBody>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
            <PromptInputTextarea
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
              disabled={externalIsStreaming}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <ChatPromptInputFiles
                open={isAtMenuOpen}
                onOpenChange={setIsAtMenuOpen}
                projectId={activeProjectId || ""}
                projectPath={project?.path || ""}
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                textareaValue={text}
              />
              {/* Slash commands - only for agents that support them */}
              {capabilities.supportsSlashCommands && (
                <ChatPromptInputSlashCommands
                  open={isSlashMenuOpen}
                  onOpenChange={setIsSlashMenuOpen}
                  projectId={activeProjectId ?? undefined}
                  onCommandSelect={handleCommandSelect}
                />
              )}
              <PromptInputSpeechButton
                onTranscriptionChange={controller.textInput.setInput}
                textareaRef={textareaRef}
              />
              {/* Model selector - only for agents that support model selection */}
              <ModelSelector
                currentModel={currentModel}
                models={capabilities.models}
                onModelChange={setModel}
              />
              <PermissionModeSelector
                permissionMode={permissionMode}
                onPermissionModeChange={setPermissionMode}
              />
            </PromptInputTools>
            <div className="flex items-center gap-2">
              {totalTokens !== undefined && (
                <TokenUsageCircle
                  totalTokens={totalTokens}
                  currentMessageTokens={currentMessageTokens}
                />
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <PromptInputSubmit
                      className={cn(
                        "h-10 w-16 md:!h-8 md:!w-8 transition-colors",
                        permissionMode === "plan" &&
                          "bg-green-500 hover:bg-green-600 text-white",
                        permissionMode === "acceptEdits" &&
                          "bg-purple-500 hover:bg-purple-600 text-white",
                        permissionMode === "bypassPermissions" &&
                          "bg-red-500 hover:bg-red-600 text-white",
                        permissionMode === "default" &&
                          "bg-gray-500 hover:bg-gray-600 text-white"
                      )}
                      status={status}
                      disabled={disabled || !isConnected}
                    />
                  </span>
                </TooltipTrigger>
                {!isConnected && (
                  <TooltipContent side="top">
                    WebSocket disconnected. Try reloading the page
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
    );
  }
);

ChatPromptInputInner.displayName = "ChatPromptInputInner";

// Wrapper component that provides the controller
export const ChatPromptInput = forwardRef<
  ChatPromptInputHandle,
  ChatPromptInputProps
>((props, ref) => {
  return (
    <PromptInputProvider>
      <ChatPromptInputInner {...props} ref={ref} />
    </PromptInputProvider>
  );
});

ChatPromptInput.displayName = "ChatPromptInput";
