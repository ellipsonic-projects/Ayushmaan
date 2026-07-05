import { Card, CardContent, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const severityVariant: Record<string, "destructive" | "default" | "secondary"> = {
  CRITICAL: "destructive",
  HIGH: "default",
  MEDIUM: "secondary",
};

const grievances = [
  {
    severity: "CRITICAL",
    time: "2h ago",
    title: "Billing Discrepancy - Q4 Invoicing",
    description:
      "Enterprise tenant MedSync reports $5,000 overcharge on RAG throughput billing.",
    category: "Billing",
  },
  {
    severity: "HIGH",
    time: "15m ago",
    title: "Whisper API Latency Issues",
    description:
      "Intermittent 503 errors reported during audio transcription at City La...",
    category: "Service Quality",
  },
  {
    severity: "MEDIUM",
    time: "1h ago",
    title: "New Feature Access Request",
    description: "Nexus Health requesting early beta access to the multi-modal diagnostic...",
    category: "Feature Request",
  },
];

export function GrievanceInbox() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Grievance Inbox</CardTitle>
        <CardAction>
          <Badge variant="destructive">8 OPEN</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {grievances.map((item) => (
          <div key={item.title} className="space-y-2 border-b border-border pb-4 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <Badge variant={severityVariant[item.severity]}>{item.severity}</Badge>
              <span className="text-xs text-muted-foreground">{item.time}</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
            <Badge variant="outline">{item.category}</Badge>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-center bg-transparent p-4 pt-0">
        <Button variant="secondary" className="w-full">
          View All Grievances
        </Button>
      </CardFooter>
    </Card>
  );
}
