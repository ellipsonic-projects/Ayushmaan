"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, Inbox as InboxIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReferralStatusBadge } from "@/components/tenant/consultant/referrals/referral-status-badge";
import { useTenantSlug } from "@/lib/tenant/slug-context";
import type { ConsultantReferralSummary } from "@/lib/api/consultant-referrals.server";

function caseCode(sourceCase: ConsultantReferralSummary["sourceCase"]) {
  if (!sourceCase) return "—";
  return sourceCase.matterKey ?? `#${sourceCase.id.slice(0, 8)}`;
}

export function ReferralsList({
  incoming,
  outgoing,
}: {
  incoming: ConsultantReferralSummary[];
  outgoing: ConsultantReferralSummary[];
}) {
  const slug = useTenantSlug();
  const [box, setBox] = useState<"incoming" | "outgoing">("incoming");
  const items = box === "incoming" ? incoming : outgoing;
  const pendingCount = incoming.filter((r) => r.status === "PENDING").length;

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4 px-0">
        <div className="px-4">
          <Tabs value={box} onValueChange={(v) => setBox(v as "incoming" | "outgoing")}>
            <TabsList variant="line">
              <TabsTrigger value="incoming">
                Received{pendingCount > 0 ? ` (${pendingCount})` : ""}
              </TabsTrigger>
              <TabsTrigger value="outgoing">Sent</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-col gap-2 px-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <InboxIcon className="h-6 w-6" />
              {box === "incoming"
                ? "No referrals have been sent to you yet."
                : "You haven't referred any cases yet."}
            </div>
          ) : (
            items.map((item) => {
              const peer = box === "incoming" ? item.fromConsultant : item.toConsultant;
              return (
                <Link
                  key={item.id}
                  href={`/${slug}/tenant/consultant/referrals/${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {item.client?.fullName ?? "Unknown client"}
                      </p>
                      <ReferralStatusBadge status={item.status} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {caseCode(item.sourceCase)} &middot; {box === "incoming" ? "From" : "To"}{" "}
                      {peer?.fullName ?? "Unknown consultant"}
                    </p>
                    {item.contextNote && (
                      <p className="mt-1 truncate text-xs text-muted-foreground italic">
                        &ldquo;{item.contextNote}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                    <Button variant="outline" size="sm">
                      View
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
