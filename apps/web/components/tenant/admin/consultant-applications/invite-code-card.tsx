"use client";

import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";

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
import {
  generateConsultantInviteCode,
  getConsultantInviteCodes,
  revokeConsultantInviteCode,
  type ConsultantInviteCode,
} from "@/lib/api/consultant-invite-codes.client";

const statusBadgeClass: Record<ConsultantInviteCode["status"], string> = {
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  USED: "border-border bg-muted text-muted-foreground",
  REVOKED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

export function InviteCodeCard() {
  const [codes, setCodes] = useState<ConsultantInviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConsultantInviteCodes()
      .then(setCodes)
      .catch(() => setError("Failed to load invite codes."))
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const code = await generateConsultantInviteCode();
      setCodes((prev) => [code, ...prev]);
    } catch {
      setError("Failed to generate a code. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeConsultantInviteCode(id);
      setCodes((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("Failed to revoke this code. Please try again.");
    }
  }

  function handleCopy(code: ConsultantInviteCode) {
    navigator.clipboard?.writeText(code.code);
    setCopiedId(code.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <Card>
      <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Consultant invite codes</CardTitle>
          <CardDescription>
            Generate a 10-character code and share it with a prospective consultant outside the app
            (phone call, WhatsApp, etc.). They'll enter it to submit their application.
          </CardDescription>
        </div>
        <CardAction>
          <Button size="sm" disabled={generating} onClick={handleGenerate}>
            {generating ? "Generating..." : "Generate code"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : codes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invite codes generated yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {codes.map((code) => (
              <div
                key={code.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-base font-semibold tracking-widest text-foreground">
                    {code.code}
                  </span>
                  <Badge variant="outline" className={statusBadgeClass[code.status]}>
                    {code.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {code.status === "ACTIVE" && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Copy code"
                        onClick={() => handleCopy(code)}
                      >
                        {copiedId === code.id ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Revoke code"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRevoke(code.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
