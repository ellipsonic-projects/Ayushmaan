"use client";

import { useState } from "react";
import {
  ChevronDown,
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComposeEmailDialog } from "@/components/tenant/shared/inbox/compose-email-dialog";
import { ConnectInboxDialog } from "@/components/tenant/shared/inbox/connect-inbox-dialog";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: number;
  from: "them" | "me";
  text: string;
  time: string;
};

const initialWendyThread: ChatMessage[] = [
  {
    id: 1,
    from: "them",
    text: "Hi, I need to reschedule our Tuesday appointment. Something came up at work. What available times do you have?",
    time: "11:52 AM",
  },
  {
    id: 2,
    from: "me",
    text: "No worries, I've sent reschedule for tomorrow at the same time.",
    time: "11:53 AM",
  },
  { id: 3, from: "them", text: "Thanks", time: "11:54 AM" },
];

const mailTabs = ["Open", "Closed", "Scheduled", "Deleted", "Other"];

function InitialsAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(" ")
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
  userEmail = "jokers584j@gmail.com",
  workspaceName = "Homeopathy",
  defaultView = "mail",
}: {
  userName?: string;
  userEmail?: string;
  workspaceName?: string;
  defaultView?: "mail" | "chat";
}) {
  const [heroDismissed, setHeroDismissed] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [view, setView] = useState<"mail" | "chat">(defaultView);
  const [messages, setMessages] = useState<ChatMessage[]>(initialWendyThread);
  const [chatInput, setChatInput] = useState("");

  function handleConnect() {
    setConnected(true);
    setConnectOpen(false);
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
          <h3 className="text-xl font-bold text-primary">
            Secure in-app messaging made simple
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep conversations private — secure messaging for your clients and team
          </p>
          <Button className="mt-4" onClick={() => setView("chat")}>
            <MessageSquareText className="h-4 w-4" />
            Secure message
          </Button>
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
            <button
              type="button"
              onClick={() => setView("mail")}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <InitialsAvatar name={userName} />
              {userName}
            </button>
          ) : (
            <p className="px-2.5 py-1.5 text-sm text-muted-foreground">No inboxes</p>
          )}

          <div className="my-2 h-px bg-border" aria-hidden />

          <Button
            variant="outline"
            className="w-full text-primary"
            onClick={() => setView("chat")}
          >
            <MessageSquareText className="h-4 w-4" />
            Secure message
          </Button>

          <div className="mt-3 flex flex-col gap-1">
            <GroupHeader icon={MessageSquareText} label="Client" />
            <button
              type="button"
              onClick={() => setView("chat")}
              className={cn(
                "relative flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors",
                view === "chat"
                  ? "bg-primary/10 text-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <span
                className="absolute top-1 left-0.5 h-1.5 w-1.5 rounded-full bg-primary"
                aria-hidden
              />
              <InitialsAvatar name="Wendy" className="bg-teal-100 text-teal-700" />
              Wendy
              <Badge variant="secondary" className="text-[10px]">
                Demo
              </Badge>
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            <GroupHeader icon={MessageSquareText} label="Team" />
            <p className="px-2.5 py-1.5 text-sm text-muted-foreground">
              No recent messages
            </p>
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
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <InitialsAvatar name="Wendy" className="bg-teal-100 text-teal-700" />
              <span className="text-sm font-semibold text-foreground">Wendy</span>
              <Badge variant="secondary" className="text-[10px]">
                Demo
              </Badge>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
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
              ))}
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
                0 conversation
              </span>
              <div className="relative max-w-sm flex-1">
                <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search conversations" className="pl-8" />
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-10 w-10 text-primary" />
              </span>
              <p className="text-base font-semibold text-foreground">
                Your conversations will appear here as soon as you start exchanging
                communications
              </p>
              <p className="text-sm text-muted-foreground">
                {connected
                  ? "Your inbox has no communications"
                  : "Connect an inbox to start sending and receiving emails"}
              </p>
              {!connected && (
                <Button variant="outline" className="text-primary" onClick={() => setConnectOpen(true)}>
                  <MailPlus className="h-4 w-4" />
                  Connect inbox
                </Button>
              )}
            </div>
          </section>
        )}
      </div>

      <ConnectInboxDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConnect={handleConnect}
      />
      <ComposeEmailDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        fromName={userName}
        fromEmail={userEmail}
        workspaceName={workspaceName}
      />
    </div>
  );
}
