import { ClipboardList } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function CaseRequirements({ requirements }: { requirements: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Client Requirements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">{requirements}</p>
      </CardContent>
    </Card>
  );
}
