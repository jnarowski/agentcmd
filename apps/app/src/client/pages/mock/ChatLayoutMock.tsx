import { SendIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/client/components/ui/button";
import { Textarea } from "@/client/components/ui/textarea";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/client/components/ai-elements/conversation";

// Mock data
const MOCK_MESSAGES = Array.from({ length: 50 }, (_, i) => ({
  id: `msg-${i}`,
  role: i % 3 === 0 ? "user" : "assistant",
  content:
    i % 3 === 0
      ? `This is a user message ${i + 1}. Can you help me with something?`
      : i % 5 === 0
        ? `This is a longer assistant response ${i + 1}. Here's a detailed explanation that spans multiple lines to test how the layout handles varying content heights. The chat interface should maintain proper scrolling behavior regardless of message length. This helps us validate that the grid layout works correctly with dynamic content sizing.`
        : `Assistant response ${i + 1}. Sure, I can help with that.`,
  timestamp: new Date(Date.now() - (50 - i) * 60000).toISOString(),
}));

export function ChatLayoutMock() {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        role: "user",
        content: input,
        timestamp: new Date().toISOString(),
      },
    ]);
    setInput("");

    // Simulate assistant response after 1s
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: `Mock response to: "${input}"`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }, 1000);
  };

  return (
    <div
      className="grid h-dvh"
      style={{
        gridTemplateRows: "auto auto 1fr auto",
      }}
    >
      {/* Mock Project Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <span className="text-sm font-semibold">P</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold">Mock Project Name</h1>
            <p className="text-xs text-muted-foreground">Testing Grid Layout</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            Settings
          </Button>
        </div>
      </header>

      {/* Mock Session Header */}
      <header className="sticky top-[52px] z-10 flex items-center justify-between gap-1.5 border-b bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground md:px-6">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-green-500" />
          <span className="font-medium">Session: mock-session-123</span>
          <span className="text-xs">•</span>
          <span className="text-xs">Started 5m ago</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">50 messages</span>
        </div>
      </header>

      {/* Chat Messages - Scrollable Area */}
      <Conversation className="overflow-y-auto">
        <ConversationContent>
          <div className="mx-auto max-w-4xl space-y-4 p-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className="mt-1 text-xs opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Chat Input - Sticky Bottom */}
      <div
        className="sticky bottom-0 z-10 border-t bg-background px-4 py-4 md:px-6"
        style={{
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto flex max-w-4xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-[200px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            size="icon"
            className="size-11 shrink-0"
          >
            <SendIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
