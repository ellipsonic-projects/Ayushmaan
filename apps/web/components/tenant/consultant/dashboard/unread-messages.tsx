import { Mail } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function UnreadMessages() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Unread Messages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="py-6 text-center text-sm text-muted-foreground">
          Messaging isn&apos;t connected yet.
        </p>
      </CardContent>
    </Card>
  );
}
