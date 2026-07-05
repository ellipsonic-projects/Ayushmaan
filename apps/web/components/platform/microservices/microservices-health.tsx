import { AudioLines, Sparkles, CreditCard, MessageSquareText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const queueBars = [30, 45, 25, 60, 40, 70, 35, 55, 45, 65, 30, 50];

type Service = {
  name: string;
  icon: LucideIcon;
  iconClass: string;
  status: string;
  metricLabel: string;
  metricValue: string;
  metricNote?: string;
};

const services: Service[] = [
  {
    name: "Whisper Queue",
    icon: AudioLines,
    iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-500",
    status: "HEALTHY",
    metricLabel: "Queue depth (24h)",
    metricValue: "",
  },
  {
    name: "AI / RAG Service",
    icon: Sparkles,
    iconClass: "bg-violet-500/10 text-violet-600 dark:text-violet-500",
    status: "STABLE",
    metricLabel: "Firescore Latency (Avg)",
    metricValue: "420ms",
  },
  {
    name: "Razorpay",
    icon: CreditCard,
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
    status: "HEALTHY",
    metricLabel: "Success Rate",
    metricValue: "99.2%",
  },
  {
    name: "Twilio / Resend",
    icon: MessageSquareText,
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
    status: "HEALTHY",
    metricLabel: "Delivery Rate",
    metricValue: "98.5%",
  },
];

export function MicroservicesHealth() {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Microservices Health</CardTitle>
          <CardDescription>
            Real-time status of critical infrastructure components
          </CardDescription>
        </div>
        <CardAction>
          <Button variant="outline" size="sm">
            View Detailed Logs
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex flex-col gap-3 rounded-xl border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${service.iconClass}`}
                  >
                    <service.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {service.name}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                >
                  {service.status}
                </Badge>
              </div>

              {service.name === "Whisper Queue" ? (
                <div className="flex h-10 items-end gap-1">
                  {queueBars.map((height, i) => (
                    <span
                      key={i}
                      className="flex-1 rounded-sm bg-primary/60"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xl font-bold text-foreground">
                  {service.metricValue}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {service.metricLabel}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
