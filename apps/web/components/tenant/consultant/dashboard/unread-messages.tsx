import { Mail, MessageSquare, Reply } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Message = {
  sender: string;
  role: string;
  subject: string;
  preview: string;
  time: string;
  initials: string;
};

const messages: Message[] = [
  {
    sender: "Jameson Webb",
    role: "Managing Director, Global Logistics",
    subject: "Urgent: Q3 Logistics Update",
    preview: "Hi Aris, I've just uploaded the latest shipment data for your review before our 9 AM...",
    time: "8:12 AM",
    initials: "JW",
  },
  {
    sender: "Sarah Jenkins",
    role: "Legal Counsel",
    subject: "Nexus Labs NDA Draft",
    preview: "The revisions you requested have been implemented. Please sign off by EOD toda...",
    time: "Yesterday",
    initials: "SJ",
  },
];

export function UnreadMessages() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Unread Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border p-0">
        <div className="hidden gap-4 px-4 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
          <span>Sender</span>
          <span>Subject Preview</span>
          <span>Time</span>
        </div>
        {messages.map((message) => (
          <div
            key={message.sender}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
          >
            <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {message.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {message.sender}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {message.role}
                </p>
              </div>
            </div>

            <div className="col-span-2 min-w-0 sm:col-span-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {message.subject}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {message.preview}
              </p>
            </div>

            <div className="flex items-center gap-2 justify-self-end">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {message.time}
              </span>
              <Button variant="outline" size="icon-sm" aria-label="Reply">
                <Reply className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-center">
        <Button variant="ghost" className="w-full gap-2 text-primary">
          <MessageSquare className="h-4 w-4" />
          Open Messaging Suite
        </Button>
      </CardFooter>
    </Card>
  );
}
