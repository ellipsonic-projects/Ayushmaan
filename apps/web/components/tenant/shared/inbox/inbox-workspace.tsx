"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Inbox,
  Mail,
  MailPlus,
  MessageSquareText,
  Plus,
  Search,
  Send,
  SendHorizonal,
  Workflow,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComposeEmailDialog } from "@/components/tenant/shared/inbox/compose-email-dialog";
import { ConnectInboxDialog } from "@/components/tenant/shared/inbox/connect-inbox-dialog";
import { cn } from "@/lib/utils";
import type { InboxConnection } from "@/lib/api/inbox.server";
import {
  disconnectInbox,
  getInboxConnectUrl,
  getInboxThread,
  listInboxThreads,
  type ThreadMessage,
  type ThreadSummary,
} from "@/lib/api/inbox.client";

type ChatMessage = {
  id: number;
  from: "them" | "me";
  text: string;
  time: string;
};

const mailTabs = ["Open", "Closed", "Scheduled", "Deleted", "Other"];

function parseFromHeader(from: string): { name: string; email: string } {
  const match = from.match(/^"?([^"<]*)"?\s*<?([^<>]*)>?$/);
  const name = match?.[1]?.trim();
  const email = match?.[2]?.trim() || from;
  return { name: name || email, email };
}

function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary",
        className
      )}
    >
      {initials}
    </span>
  );
}

function FolderButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Inbox;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function GroupHeader({ icon: Icon, label }: { icon: typeof Inbox; label: string }) {
  return (
    <span className="flex items-center gap-2 px-2.5 text-sm font-semibold text-foreground">
      <Icon className="h-4 w-4" />
      {label}
      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
    </span>
  );
}

export function InboxWorkspace({
  userName = "Advik Advik",
  workspaceName = "Homeopathy",
  defaultView = "mail",
  initialConnection = { connected: false, emailAddress: null, status: null },
  connectResult = null,
}: {
  userName?: string;
  workspaceName?: string;
  defaultView?: "mail" | "chat";
  initialConnection?: InboxConnection;
  connectResult?: "connected" | "error" | null;
}) {
  const [heroDismissed, setHeroDismissed] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [connection, setConnection] = useState(initialConnection);
  const [connecting, setConnecting] = useState(false);
  const [banner, setBanner] = useState(connectResult);
  const [view, setView] = useState<"mail" | "chat">(defaultView);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ThreadMessage[] | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const connected = connection.connected;

  useEffect(() => {
    if (!connected) return;
    setThreadsLoading(true);
    setThreadsError(null);
    listInboxThreads()
      .then(setThreads)
      .catch(() => setThreadsError("Couldn't load your inbox. Try again shortly."))
      .finally(() => setThreadsLoading(false));
  }, [connected]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const url = await getInboxConnectUrl();
      window.location.href = url;
    } catch {
      setConnecting(false);
      setBanner("error");
    }
  }

  async function handleDisconnect() {
    await disconnectInbox().catch(() => undefined);
    setConnection({ connected: false, emailAddress: null, status: null });
    setThreads([]);
    setSelectedThread(null);
  }

  async function openThread(threadId: string) {
    setThreadLoading(true);
    try {
      const thread = await getInboxThread(threadId);
      setSelectedThread(thread);
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, unread: false } : t)));
    } catch {
      setThreadsError("Couldn't open this conversation.");
    } finally {
      setThreadLoading(false);
    }
  }

  function sendChatMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        from: "me",
        text,
        time: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Inbox className="h-5 w-5" />
          Inbox
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Button
              disabled={!connected}
              onClick={() => setComposeOpen(true)}
              className="rounded-r-none"
            >
              <Plus className="h-4 w-4" />
              Compose
            </Button>
            <Button
              disabled={!connected}
              aria-label="Compose options"
              size="icon"
              className="rounded-l-none border-l border-primary-foreground/20"
              onClick={() => setComposeOpen(true)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" aria-label="Workflows">
            <Workflow className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {banner && (
        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 text-sm",
            banner === "connected"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          <span>
            {banner === "connected"
              ? `Gmail connected — ${connection.emailAddress ?? "your inbox"} is ready.`
              : "Couldn't connect your Gmail account. Please try again."}
          </span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setBanner(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Hero banner */}
      {!heroDismissed && (
        <div className="relative overflow-hidden rounded-xl border border-border bg-primary/5 px-6 py-8 text-center">
          <Button
            variant="outline"
            size="sm"
            className="absolute top-3 right-3"
            onClick={() => setHeroDismissed(true)}
          >
            Got it!
          </Button>
          <h3 className="text-xl font-bold text-primary">Secure in-app messaging made simple</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep conversations private — secure messaging for your clients and team
          </p>
          <span
            className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
            onClick={() => setView("chat")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setView("chat");
              }
            }}
          >
            <MessageSquareText className="h-4 w-4" />
            Secure message
          </span>
        </div>
      )}

      {/* Workspace */}
      <div className="flex min-h-[60svh] overflow-hidden rounded-xl border border-border bg-background">
        {/* Folder rail */}
        <aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-border p-3">
          <FolderButton
            icon={Inbox}
            label="All"
            active={view === "mail"}
            onClick={() => setView("mail")}
          />
          <FolderButton icon={Send} label="Sent" onClick={() => setView("mail")} />
          <FolderButton icon={Mail} label="Draft" onClick={() => setView("mail")} />

          <div className="mt-2 flex items-center justify-between px-2.5">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <MailPlus className="h-4 w-4" />
              Inboxes
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
            <button
              type="button"
              onClick={() => setConnectOpen(true)}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>
          {connected ? (
            <div className="flex items-center justify-between gap-1 px-1">
              <button
                type="button"
                onClick={() => setView("mail")}
                className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <InitialsAvatar name={connection.emailAddress ?? userName} />
                <span className="truncate">{connection.emailAddress}</span>
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="shrink-0 text-xs font-medium text-muted-foreground hover:text-destructive hover:underline"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <p className="px-2.5 py-1.5 text-sm text-muted-foreground">No inboxes</p>
          )}

          <div className="my-2 h-px bg-border" aria-hidden />

          <Button variant="outline" className="w-full text-primary" onClick={() => setView("chat")}>
            <MessageSquareText className="h-4 w-4" />
            Secure message
          </Button>

          <div className="mt-3 flex flex-col gap-1">
            <GroupHeader icon={MessageSquareText} label="Client" />
            <p className="px-2.5 py-1.5 text-sm text-muted-foreground">No conversations yet</p>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            <GroupHeader icon={MessageSquareText} label="Team" />
            <p className="px-2.5 py-1.5 text-sm text-muted-foreground">No recent messages</p>
          </div>
        </aside>

        {/* Main pane */}
        {view === "chat" ? (
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Choose recipients" className="pl-8" />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close conversation"
                className="ml-auto"
                onClick={() => setView("mail")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <p className="m-auto text-sm text-muted-foreground">No messages yet</p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[70%] rounded-lg px-3 py-2 text-sm leading-5",
                      message.from === "me"
                        ? "self-end bg-primary text-primary-foreground"
                        : "self-start bg-muted text-foreground"
                    )}
                  >
                    {message.text}
                    <span
                      className={cn(
                        "mt-1 block text-right text-[10px]",
                        message.from === "me"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {message.time}
                    </span>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendChatMessage();
              }}
              className="flex items-center gap-2 border-t border-border px-4 py-3"
            >
              <Input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Try to send your own secure message"
                aria-label="Secure message"
              />
              <Button type="submit" size="icon" aria-label="Send secure message">
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </form>
          </section>
        ) : selectedThread ? (
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Back to conversations"
                onClick={() => setSelectedThread(null)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold text-foreground">
                {selectedThread[0]?.subject}
              </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
              {selectedThread.map((message) => {
                const { name } = parseFromHeader(message.from);
                return (
                  <div key={message.id} className="rounded-lg border border-border">
                    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                      <InitialsAvatar name={name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                        <p className="truncate text-xs text-muted-foreground">to {message.to}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{message.date}</span>
                    </div>
                    {message.html ? (
                      <iframe
                        title={`message-${message.id}`}
                        srcDoc={message.html}
                        sandbox=""
                        className="h-64 w-full border-0"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap px-3 py-2 text-sm text-foreground">
                        {message.text}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-border px-4 pt-2">
              <Tabs defaultValue="Open">
                <TabsList variant="line">
                  {mailTabs.map((tab) => (
                    <TabsTrigger key={tab} value={tab}>
                      {tab}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
              <span className="text-sm font-semibold text-foreground">
                {connected
                  ? `${threads.length} conversation${threads.length === 1 ? "" : "s"}`
                  : "0 conversation"}
              </span>
              <div className="relative max-w-sm flex-1">
                <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search conversations" className="pl-8" />
              </div>
            </div>

            {connected && (threadsLoading || threadLoading) ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : connected && threadsError ? (
              <div className="flex flex-1 items-center justify-center text-sm text-destructive">
                {threadsError}
              </div>
            ) : connected && threads.length > 0 ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {threads.map((thread) => {
                  const { name } = parseFromHeader(thread.from);
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => openThread(thread.id)}
                      className="flex items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted"
                    >
                      <InitialsAvatar name={name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              thread.unread ? "font-semibold text-foreground" : "text-foreground"
                            )}
                          >
                            {name}
                          </span>
                          <span className="truncate text-sm text-muted-foreground">
                            {thread.subject}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{thread.snippet}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{thread.date}</span>
                      {thread.unread && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          aria-hidden
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-10 w-10 text-primary" />
                </span>
                <p className="text-base font-semibold text-foreground">
                  Your conversations will appear here as soon as you start exchanging communications
                </p>
                <p className="text-sm text-muted-foreground">
                  {connected
                    ? "Your inbox has no communications"
                    : "Connect an inbox to start sending and receiving emails"}
                </p>
                {!connected && (
                  <Button
                    variant="outline"
                    className="text-primary"
                    onClick={() => setConnectOpen(true)}
                  >
                    <MailPlus className="h-4 w-4" />
                    Connect inbox
                  </Button>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      <ConnectInboxDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConnect={handleConnect}
        connecting={connecting}
      />
      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        fromName={userName}
        fromEmail={connection.emailAddress ?? ""}
        workspaceName={workspaceName}
      />
    </div>
  );
}
