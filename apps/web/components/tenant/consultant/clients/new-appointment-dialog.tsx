"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TenantClient } from "@/lib/api/clients.server";
import {
  bookConsultantAppointment,
  searchOwnClients,
} from "@/lib/api/consultant-appointments.client";
import { CATEGORY_LABEL } from "@/lib/constants/consultant-category";

// instructions.md §2 — client list "New Appointment" flow: pick a client
// (skipped when `client` is pre-supplied, e.g. the per-row trigger), then
// explicitly choose an existing ACTIVE case with this consultant or start a
// new one, before scheduling. Posts to the consultant-initiated booking
// endpoint (instructions.md §1), which defaults the appointment to APPROVED.
//
// instructions.md §2 (case detail page) — when `presetCaseId` is supplied
// alongside `client`, the case is already known (the consultant is looking
// at it), so the case-selector step is skipped entirely and the booking
// posts straight away with `caseMode: "EXISTING"`.
export function NewAppointmentDialog({
  ownConsultantId,
  client,
  presetCaseId,
  trigger,
}: {
  ownConsultantId: string;
  client?: Pick<TenantClient, "id" | "fullName" | "user" | "cases">;
  presetCaseId?: string;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [selectedClient, setSelectedClient] = useState<Pick<
    TenantClient,
    "id" | "fullName" | "user" | "cases"
  > | null>(client ?? null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TenantClient[]>([]);
  const [searching, setSearching] = useState(false);

  const [caseChoice, setCaseChoice] = useState<"existing" | "new" | null>(
    presetCaseId ? "existing" : null
  );
  const [existingCaseId, setExistingCaseId] = useState(presetCaseId ?? "");
  const [category, setCategory] = useState("");
  const [matterKey, setMatterKey] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetCaseSelection() {
    setCaseChoice(presetCaseId ? "existing" : null);
    setExistingCaseId(presetCaseId ?? "");
    setCategory("");
    setMatterKey("");
  }

  function reset() {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchSeq.current++;
    setSelectedClient(client ?? null);
    setQuery("");
    setResults([]);
    resetCaseSelection();
    setScheduledStart("");
    setScheduledEnd("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleChangeClient() {
    setSelectedClient(null);
    resetCaseSelection();
  }

  // Debounced + sequence-guarded: a slower response for an earlier keystroke
  // must never overwrite the results of a later one.
  const searchSeq = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(value: string) {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      searchSeq.current++;
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const seq = ++searchSeq.current;
    searchTimer.current = setTimeout(async () => {
      try {
        const found = await searchOwnClients(trimmed);
        if (seq === searchSeq.current) setResults(found);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 300);
  }

  const ownActiveCases =
    selectedClient?.cases.filter(
      (c) => c.consultantId === ownConsultantId && c.status === "ACTIVE"
    ) ?? [];

  const canSubmit =
    Boolean(selectedClient) &&
    Boolean(scheduledStart) &&
    Boolean(scheduledEnd) &&
    ((caseChoice === "existing" && Boolean(existingCaseId)) ||
      (caseChoice === "new" && Boolean(category)));

  async function handleSubmit() {
    if (!selectedClient || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await bookConsultantAppointment(ownConsultantId, {
        clientId: selectedClient.id,
        caseMode: caseChoice === "existing" ? "EXISTING" : "NEW",
        caseId: caseChoice === "existing" ? existingCaseId : undefined,
        category: caseChoice === "new" ? category : undefined,
        matterKey: caseChoice === "new" ? matterKey || undefined : undefined,
        scheduledStart: new Date(scheduledStart).toISOString(),
        scheduledEnd: new Date(scheduledEnd).toISOString(),
      });
      handleOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {!selectedClient ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="client-search">Client</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="client-search"
                    placeholder="Search clients by name..."
                    className="pl-8"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
                {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
                {results.length > 0 && (
                  <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-border p-1">
                    {results.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex flex-col items-start rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted/60"
                        onClick={() => {
                          setSelectedClient(c);
                          setResults([]);
                          setQuery("");
                        }}
                      >
                        <span className="font-medium text-foreground">{c.fullName}</span>
                        <span className="text-xs text-muted-foreground">{c.user.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {!client && (
                  <div className="flex items-center justify-between rounded-md border border-border p-2.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {selectedClient.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">{selectedClient.user.email}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleChangeClient}>
                      Change
                    </Button>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {presetCaseId ? (
                    <div className="rounded-md border border-border p-2.5 text-sm text-muted-foreground">
                      Booking against this case.
                    </div>
                  ) : (
                    <>
                      <Label>Case</Label>
                      <div className="flex flex-col gap-1.5">
                        {ownActiveCases.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between rounded-md border border-border p-2.5"
                          >
                            <div>
                              <p className="text-sm text-foreground">
                                {c.matterKey ?? CATEGORY_LABEL[c.category] ?? c.category}
                              </p>
                              <div className="mt-0.5 flex flex-wrap gap-1">
                                <Badge variant="outline">
                                  {CATEGORY_LABEL[c.category] ?? c.category}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={
                                caseChoice === "existing" && existingCaseId === c.id
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => {
                                setCaseChoice("existing");
                                setExistingCaseId(c.id);
                              }}
                            >
                              Use this case
                            </Button>
                          </div>
                        ))}

                        <Button
                          variant={caseChoice === "new" ? "default" : "outline"}
                          size="sm"
                          className="w-fit"
                          onClick={() => setCaseChoice("new")}
                        >
                          Start New Case
                        </Button>
                      </div>

                      {caseChoice === "new" && (
                        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="new-case-category">Category</Label>
                            <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                              <SelectTrigger id="new-case-category" className="w-full">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="new-case-matter-key">Matter (optional)</Label>
                            <Input
                              id="new-case-matter-key"
                              value={matterKey}
                              onChange={(e) => setMatterKey(e.target.value)}
                              placeholder="e.g. Property dispute"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-appt-start">Start</Label>
                    <Input
                      id="new-appt-start"
                      type="datetime-local"
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-appt-end">End</Label>
                    <Input
                      id="new-appt-end"
                      type="datetime-local"
                      value={scheduledEnd}
                      onChange={(e) => setScheduledEnd(e.target.value)}
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            )}
          </div>

          {selectedClient && (
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
                {submitting ? "Booking…" : "Book Appointment"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
