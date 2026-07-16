"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAppointmentForClient,
  createClient,
  createCase,
} from "@/lib/api/appointments.client";
import type { TenantClient } from "@/lib/api/clients.server";
import type { ConsultantProfile } from "@/lib/api/consultants.server";

export function NewAppointmentForm({
  clients,
  consultants,
}: {
  clients: TenantClient[];
  consultants: ConsultantProfile[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">("existing");

  // Existing-client mode
  const [clientId, setClientId] = useState("");
  const [caseId, setCaseId] = useState("");

  // New-client mode
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newClientConsultantId, setNewClientConsultantId] = useState("");
  const [requirements, setRequirements] = useState("");

  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId]
  );

  const activeCases = useMemo(
    () => selectedClient?.cases.filter((c) => c.status === "ACTIVE") ?? [],
    [selectedClient]
  );

  const canSubmit =
    mode === "existing"
      ? Boolean(clientId && caseId && scheduledStart && scheduledEnd)
      : Boolean(fullName && email && newClientConsultantId && scheduledStart && scheduledEnd);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      let targetCaseId = caseId;

      if (mode === "new") {
        const consultant = consultants.find((c) => c.id === newClientConsultantId);
        if (!consultant) throw new Error("Select a consultant");

        const client = await createClient({
          email,
          fullName,
          phone: phone || undefined,
        });
        const newCase = await createCase({
          clientId: client.clientProfile.id,
          consultantId: consultant.id,
          category: consultant.category,
          requirements: requirements || undefined,
        });
        targetCaseId = newCase.id;
      }

      await createAppointmentForClient(targetCaseId, {
        scheduledStart: new Date(scheduledStart).toISOString(),
        scheduledEnd: new Date(scheduledEnd).toISOString(),
        meetingLink: meetingLink || undefined,
      });
      router.push("/tenant/admin/appointments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create appointment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book on behalf of a client</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Tabs value={mode} onValueChange={(value) => setMode(value as "existing" | "new")}>
          <TabsList>
            <TabsTrigger value="existing">Existing client</TabsTrigger>
            <TabsTrigger value="new">New client</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="flex flex-col gap-5 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label>Client</Label>
              <Select
                value={clientId}
                onValueChange={(value) => {
                  setClientId(value ?? "");
                  setCaseId("");
                }}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClient && (
              <div className="flex flex-col gap-1.5">
                <Label>Case</Label>
                {activeCases.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    This client has no active case yet — ask their consultant to open one from the
                    Cases page before booking an appointment.
                  </p>
                ) : (
                  <Select value={caseId} onValueChange={(value) => setCaseId(value ?? "")}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select a case" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCases.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.consultant.fullName} — {c.category}
                          {c.matterKey ? ` (${c.matterKey})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="new" className="flex flex-col gap-5 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                An invite email is sent so this client can sign in later.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Consultant</Label>
              <Select
                value={newClientConsultantId}
                onValueChange={(value) => setNewClientConsultantId(value ?? "")}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select a consultant" />
                </SelectTrigger>
                <SelectContent>
                  {consultants.map((consultant) => (
                    <SelectItem key={consultant.id} value={consultant.id}>
                      {consultant.fullName} — {consultant.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requirements">Client requirements</Label>
              <Textarea
                id="requirements"
                placeholder="Briefly describe what the client needs help with"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduledStart">Start</Label>
            <Input
              id="scheduledStart"
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduledEnd">End</Label>
            <Input
              id="scheduledEnd"
              type="datetime-local"
              value={scheduledEnd}
              onChange={(e) => setScheduledEnd(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="meetingLink">Meeting link (optional)</Label>
          <Input
            id="meetingLink"
            type="url"
            placeholder="https://meet.example.com/..."
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push("/tenant/admin/appointments")}>
            Cancel
          </Button>
          <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? "Booking…" : "Book Appointment"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
