"use client";

import { useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatMessageItem } from "@/components/tenant/consultant/session-detail/session-detail-data";

const mockReply =
  "Based on this case, Sarah's initial assessment flagged her as risk-averse. Her portfolio risk assessment is currently in progress and due in a few hours. Let me know if you'd like a summary to share with her.";

export function AiChatSidebar({ initialMessages }: { initialMessages: ChatMessageItem[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSend() {
    const content = draft.trim();
    if (!content || loading) return;

    const userMessage: ChatMessageItem = {
      id: `chat-${Date.now()}`,
      sender: "consultant",
      content,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setLoading(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `chat-${Date.now()}-ai`,
          sender: "ai",
          content: mockReply,
          createdAt: new Date(),
        },
      ]);
      setLoading(false);
    }, 1200);
  }

  return (
    <aside className="sticky top-5 flex h-[calc(100vh-6.5rem)] w-full shrink-0 flex-col rounded-xl border border-border bg-card lg:w-80">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">AI Assistant</h2>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm",
              message.sender === "ai"
                ? "self-start bg-muted text-foreground"
                : "self-end bg-primary text-primary-foreground"
            )}
          >
            {message.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 self-start rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking...
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          placeholder="Ask about this case..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="min-h-8 resize-none"
          rows={1}
        />
        <Button size="icon" aria-label="Send message" onClick={handleSend} disabled={!draft.trim() || loading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
