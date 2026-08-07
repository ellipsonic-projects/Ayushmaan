"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Loader2, Paperclip, ShieldCheck } from "lucide-react";
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
  requestCaseForClient,
  requestAdminDocumentUploadUrl,
  uploadAdminDocumentFile,
  createAdminDocument,
} from "@/lib/api/appointments.client";
import type { TenantClient } from "@/lib/api/clients.server";
import { useTenantSlug } from "@/lib/tenant/slug-context";
import { CATEGORY_OPTIONS } from "@/lib/categories";

const BOOKING_FEE = 500;

export function NewAppointmentForm({ clients }: { clients: TenantClient[] }) {
  const router = useRouter();
  const slug = useTenantSlug();
  const [mode, setMode] = useState<"existing" | "new">("existing");

  // Existing-client mode
  const [clientId, setClientId] = useState("");
  const [caseId, setCaseId] = useState("");

  // New-client mode
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newClientCategory, setNewClientCategory] = useState("");
  const [requirementsSubject, setRequirementsSubject] = useState("");
  const [requirements, setRequirements] = useState("");

  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  function handleStripePayment() {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setPaid(true);
    }, 1200);
  }

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
      : Boolean(fullName && email && phone && newClientCategory && scheduledStart && scheduledEnd);

  async function handleSubmit() {
    if (!canSubmit || !paid) return;
    setSubmitting(true);
    setError(null);
    try {
      let targetCaseId = caseId;

      if (mode === "new") {
        const client = await createClient({
          email,
          fullName,
          phone,
        });
        // No manual consultant matching — this opens a PENDING_ASSIGNMENT
        // case + REQUESTED appointment, same as the client self-service
        // flow. Approve it from the Pending Approvals list once ready; any
        // consultant serving this field can then claim it.
        const result = await requestCaseForClient({
          clientId: client.clientProfile.id,
          category: newClientCategory,
          requirementsSubject: requirementsSubject || undefined,
          requirements: requirements || undefined,
          scheduledStart: new Date(scheduledStart).toISOString(),
          scheduledEnd: new Date(scheduledEnd).toISOString(),
          meetingLink: meetingLink || undefined,
        });
        targetCaseId = result.case.id;
      } else {
        await createAppointmentForClient(targetCaseId, {
          scheduledStart: new Date(scheduledStart).toISOString(),
          scheduledEnd: new Date(scheduledEnd).toISOString(),
          meetingLink: meetingLink || undefined,
        });
      }

      for (const file of attachedFiles) {
        const { path, token } = await requestAdminDocumentUploadUrl(targetCaseId, file.name);
        await uploadAdminDocumentFile(path, token, file);
        await createAdminDocument(targetCaseId, { fileName: file.name, storagePath: path });
      }

      router.push(`/${slug}/tenant/admin/appointments`);
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
                <PhoneInput id="phone" value={phone} onChange={(value) => setPhone(value ?? "")} />
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
              <Label>Field</Label>
              <Select
                value={newClientCategory}
                onValueChange={(value) => setNewClientCategory(value ?? "")}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select a field" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                No consultant is assigned here — approve the request once ready, and any consultant
                serving this field can claim it.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requirementsSubject">Subject</Label>
              <Input
                id="requirementsSubject"
                placeholder="Short summary, e.g. Divorce filing help"
                value={requirementsSubject}
                onChange={(e) => setRequirementsSubject(e.target.value)}
              />
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="attachedFiles" className="flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            Attach documents (optional)
          </Label>
          <Input
            id="attachedFiles"
            type="file"
            multiple
            onChange={(e) => setAttachedFiles(Array.from(e.target.files ?? []))}
          />
          {attachedFiles.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {attachedFiles.length} file{attachedFiles.length === 1 ? "" : "s"} selected
            </p>
          )}
        </div>

        {/* <div className="flex flex-col gap-3 rounded-lg border border-border p-3"> */}
        {/* <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Booking fee</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              ₹{BOOKING_FEE.toLocaleString("en-IN")}
            </span>
          </div> */}

        {/* {paid ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-primary">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Payment successful — you&apos;re ready to book.
            </div>
          ) : (
            <>
              <Button
                type="button"
                onClick={handleStripePayment}
                disabled={paying}
                className="gap-2 bg-[#635BFF] text-white hover:bg-[#635BFF]/90"
              >
                {paying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {paying
                  ? "Processing payment…"
                  : `Pay ₹${BOOKING_FEE.toLocaleString("en-IN")} with Stripe`}
              </Button>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Payments are securely processed by Stripe. Your card details are never stored on our
                servers.
              </p>
            </>
          )} */}
        {/* </div> */}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/${slug}/tenant/admin/appointments`)}
          >
            Cancel
          </Button>
          <Button disabled={!canSubmit || !paid || submitting} onClick={handleSubmit}>
            {submitting ? "Booking…" : "Book Appointment"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
