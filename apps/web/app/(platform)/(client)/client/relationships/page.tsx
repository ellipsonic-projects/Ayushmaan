import Link from "next/link";
import { CalendarPlus, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const relationships = [
  {
    name: "Dr. Aris Thorne",
    role: "Primary Consultant",
    speciality: "Clinical Psychology",
    nextSession: "Thu, Jul 9, 2026 · 10:30 AM",
    initials: "AT",
    status: "Active",
  },
  {
    name: "Dr. Mira Kapoor",
    role: "Therapist",
    speciality: "Cognitive Behavioural Therapy",
    nextSession: "Tue, Jul 14, 2026 · 3:00 PM",
    initials: "MK",
    status: "Active",
  },
  {
    name: "Rahul Menon",
    role: "Care Coordinator",
    speciality: "Scheduling & Support",
    nextSession: null,
    initials: "RM",
    status: "Support",
  },
];

export default function ClientRelationshipsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My relationships</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The consultants and staff supporting your care
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {relationships.map((person) => (
          <Card key={person.name}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {person.initials}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold text-foreground">{person.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {person.role} · {person.speciality}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant={person.status === "Active" ? "default" : "secondary"}>
                  {person.status}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {person.nextSession ? `Next: ${person.nextSession}` : "No upcoming session"}
                </p>
              </div>

              <div className="flex gap-2 border-t border-border pt-3">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message
                </Button>
                <Button asChild size="sm" className="flex-1 gap-1.5">
                  <Link href="/client/appointments/book">
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Book
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
