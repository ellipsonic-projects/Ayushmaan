import Link from "next/link";
import { CalendarPlus, History, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getOwnClientProfile, type OwnClientCase } from "@/lib/api/clients.server";

const UPCOMING_STATUSES = ["REQUESTED", "ADMIN_APPROVED", "APPROVED", "RESCHEDULE_PROPOSED"];

// A case's completed/past sessions with this consultant, newest first — the
// "case timeline" shown on each relationship card.
interface TimelineEntry {
  id: string;
  when: string;
  status: string;
}

function getInitials(name: string) {
  const parts = name
    .replace(/^Dr\.?\s+/i, "")
    .split(" ")
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function formatCategory(category: string) {
  return category
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function formatSession(date: Date) {
  return (
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " · " +
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

interface RelationshipCard {
  id: string;
  name: string;
  category: string;
  speciality: string;
  nextSession: string | null;
  initials: string;
  status: "Active" | "Support";
  timeline: TimelineEntry[];
}

function buildRelationships(cases: OwnClientCase[]): RelationshipCard[] {
  const now = Date.now();
  const byConsultant = new Map<
    string,
    {
      consultant: NonNullable<OwnClientCase["consultant"]>;
      isActive: boolean;
      nextStart: Date | null;
      // Raw past appointments, kept unsorted/unformatted per consultant so a
      // consultant seen across multiple cases still ends up with one
      // correctly-ordered timeline instead of one sorted per case.
      pastAppointments: { id: string; start: Date; status: string }[];
    }
  >();

  for (const c of cases) {
    if (!c.consultant) continue;

    const nextStart =
      c.appointments
        .filter(
          (a) => UPCOMING_STATUSES.includes(a.status) && new Date(a.scheduledStart).getTime() >= now
        )
        .map((a) => new Date(a.scheduledStart))
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

    const pastAppointments = c.appointments
      .filter((a) => new Date(a.scheduledStart).getTime() < now)
      .map((a) => ({ id: a.id, start: new Date(a.scheduledStart), status: a.status }));

    const existing = byConsultant.get(c.consultant.id);
    if (!existing) {
      byConsultant.set(c.consultant.id, {
        consultant: c.consultant,
        isActive: c.status === "ACTIVE",
        nextStart,
        pastAppointments,
      });
    } else {
      if (c.status === "ACTIVE") existing.isActive = true;
      if (nextStart && (!existing.nextStart || nextStart < existing.nextStart)) {
        existing.nextStart = nextStart;
      }
      existing.pastAppointments.push(...pastAppointments);
    }
  }

  return Array.from(byConsultant.values()).map(
    ({ consultant, isActive, nextStart, pastAppointments }) => ({
      id: consultant.id,
      name: consultant.fullName,
      category: consultant.category,
      speciality: formatCategory(consultant.category),
      nextSession: nextStart ? formatSession(nextStart) : null,
      initials: getInitials(consultant.fullName),
      status: isActive ? "Active" : "Support",
      // Case timeline — every past appointment with this consultant, newest first.
      timeline: pastAppointments
        .sort((a, b) => b.start.getTime() - a.start.getTime())
        .map((a) => ({ id: a.id, when: formatSession(a.start), status: a.status })),
    })
  );
}

export default async function ClientRelationshipsPage() {
  const profile = await getOwnClientProfile();
  const relationships = buildRelationships(profile?.cases ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My relationships</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The consultants and staff supporting your care
        </p>
      </div>

      {relationships.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No consultants yet — book an appointment to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {relationships.map((person) => (
            <Card key={person.id}>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {person.initials}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold text-foreground">{person.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {person.speciality}
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

                {person.timeline.length > 0 && (
                  <details className="group border-t border-border pt-3 text-xs">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-muted-foreground marker:content-none">
                      <History className="h-3.5 w-3.5" />
                      Case timeline ({person.timeline.length})
                    </summary>
                    <ol className="mt-2 flex flex-col gap-1.5 border-l border-border pl-3">
                      {person.timeline.map((entry) => (
                        <li key={entry.id} className="text-muted-foreground">
                          <span className="text-foreground">{entry.when}</span>
                          {" · "}
                          {formatCategory(entry.status)}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}

                <div className="flex gap-2 border-t border-border pt-3">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Message
                  </Button>
                  <Button asChild size="sm" className="flex-1 gap-1.5">
                    <Link href={`/client/appointments/book?category=${person.category}`}>
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Follow up
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
