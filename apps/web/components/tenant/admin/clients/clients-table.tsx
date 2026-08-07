import { CalendarPlus, MessageSquare, MoreVertical, Phone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewAppointmentDialog } from "@/components/tenant/consultant/clients/new-appointment-dialog";
import type { TenantClient } from "@/lib/api/clients.server";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("");
}

// `ownConsultantId` is only passed from the consultant-facing clients page —
// the "New Appointment" action (instructions.md §2) is a CONSULTANT-only
// booking flow, so it stays hidden when this same table renders for a
// TENANT_ADMIN caller.
export function ClientsTable({
  clients,
  ownConsultantId,
}: {
  clients: TenantClient[];
  ownConsultantId?: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="px-0">
        <div className="overflow-x-auto px-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Client Name</th>
                <th className="py-2 pr-4 font-medium">Contact</th>
                <th className="py-2 pr-4 font-medium">CRM Tags</th>
                <th className="py-2 pr-4 font-medium">Consultant</th>
                <th className="py-2 pr-4 font-medium">Joined</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const tags = Array.from(new Set(client.cases.flatMap((c) => c.tags)));
                const consultantNames = Array.from(
                  new Set(client.cases.map((c) => c.consultant.fullName))
                );
                return (
                  <tr
                    key={client.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                          {initials(client.fullName)}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">{client.fullName}</p>
                          <p className="text-xs text-muted-foreground">{client.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!client.user.phone}
                          aria-label={`Call ${client.fullName}`}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Message ${client.fullName}`}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {tags.length > 0 ? (
                          tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {consultantNames.length > 0 ? consultantNames.join(", ") : "—"}
                    </td>
                    <td className="py-3 pr-4 text-foreground">
                      {new Date(client.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        {ownConsultantId && (
                          <NewAppointmentDialog
                            ownConsultantId={ownConsultantId}
                            client={client}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`New appointment for ${client.fullName}`}
                              >
                                <CalendarPlus className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`More actions for ${client.fullName}`}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between px-4 text-xs text-muted-foreground">
          <span>{clients.length} clients</span>
        </div>
      </CardContent>
    </Card>
  );
}
