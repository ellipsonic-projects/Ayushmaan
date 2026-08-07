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
import { Paperclip } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCase,
  createDocument,
  requestDocumentUploadUrl,
  uploadCaseDocumentFile,
} from "@/lib/api/case-detail.client";
import { createClient } from "@/lib/api/appointments.client";
import type { TenantClient } from "@/lib/api/clients.server";
import { useTenantSlug } from "@/lib/tenant/slug-context";
import { CATEGORY_OPTIONS } from "@/lib/categories";

export function NewCaseForm({ clients }: { clients: TenantClient[] }) {
  const router = useRouter();
  const slug = useTenantSlug();
  const [mode, setMode] = useState<"existing" | "new">("existing");

  // Existing-client mode
  const [clientId, setClientId] = useState("");

  // New-client mode
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [category, setCategory] = useState("");
  const [matterKey, setMatterKey] = useState("");
  const [requirementsSubject, setRequirementsSubject] = useState("");
  const [requirements, setRequirements] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId]
  );

  const canSubmit =
    mode === "existing"
      ? Boolean(clientId && category)
      : Boolean(fullName && email && phone && category);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      let targetClientId = clientId;

      if (mode === "new") {
        const client = await createClient({
          email,
          fullName,
          phone,
        });
        targetClientId = client.clientProfile.id;
      }

      const created = await createCase({
        clientId: targetClientId,
        category,
        matterKey: matterKey || undefined,
        requirementsSubject: requirementsSubject || undefined,
        requirements: requirements || undefined,
      });

      for (const file of attachedFiles) {
        const { path, token } = await requestDocumentUploadUrl(created.id, file.name);
        await uploadCaseDocumentFile(path, token, file);
        await createDocument(created.id, { fileName: file.name, storagePath: path });
      }

      router.push(`/${slug}/tenant/consultant/cases/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New case</CardTitle>
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
              <Select value={clientId} onValueChange={(value) => setClientId(value ?? "")}>
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
              {selectedClient && (
                <p className="text-xs text-muted-foreground">{selectedClient.user.email}</p>
              )}
            </div>
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
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-1.5">
          <Label>Field</Label>
          <Select value={category} onValueChange={(value) => setCategory(value ?? "")}>
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
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="matterKey">Matter key (optional)</Label>
          <Input
            id="matterKey"
            placeholder="Disambiguates a concurrent case for the same client"
            value={matterKey}
            onChange={(e) => setMatterKey(e.target.value)}
          />
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

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push(`/${slug}/tenant/consultant/cases`)}>
            Cancel
          </Button>
          <Button disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? "Creating…" : "Create Case"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
