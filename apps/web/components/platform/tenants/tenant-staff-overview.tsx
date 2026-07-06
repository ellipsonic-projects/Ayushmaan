import { Plus, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Staff = {
  name: string;
  email: string;
  role: "Owner" | "Consultant";
  activity: string;
  activityTone?: "danger";
};

const staff: Staff[] = [
  {
    name: "Arjun Sharma",
    email: "arjun@acme.com",
    role: "Owner",
    activity: "Active 2m ago",
  },
  {
    name: "Sarah Lopez",
    email: "sarah.l@acme.com",
    role: "Consultant",
    activity: "Active yesterday",
  },
  {
    name: "Michael Kim",
    email: "m.kim@acme.com",
    role: "Consultant",
    activity: "Suspended",
    activityTone: "danger",
  },
];

const roleVariant: Record<Staff["role"], "default" | "outline"> = {
  Owner: "default",
  Consultant: "outline",
};

export function TenantStaffOverview() {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Staff Overview
            </h3>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
            <Plus className="h-3.5 w-3.5" />
            Add Member
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {staff.map((member) => (
            <div
              key={member.email}
              className="flex items-center gap-3 rounded-lg px-1.5 py-1 -mx-1.5 transition-colors hover:bg-muted/50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {member.name
                  .split(" ")
                  .map((part) => part.charAt(0))
                  .join("")}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {member.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.email}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={roleVariant[member.role]}>{member.role}</Badge>
                <span
                  className={
                    member.activityTone === "danger"
                      ? "text-xs font-medium text-destructive"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {member.activity}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Button variant="ghost" size="sm" className="text-primary">
          View All 24 Members
        </Button>
      </CardContent>
    </Card>
  );
}
