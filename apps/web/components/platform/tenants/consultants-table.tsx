"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Consultant = {
  name: string;
  consultantId: string;
  specialization: string;
  totalClients: number;
  avgRating: number;
  sentiment: "Exceptional" | "Positive" | "Mixed";
  avatarClass: string;
};

const consultants: Consultant[] = [
  {
    name: "Dr. Alistair Vance",
    consultantId: "CON-88219",
    specialization: "Regulatory Compliance",
    totalClients: 1248,
    avgRating: 4.9,
    sentiment: "Exceptional",
    avatarClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  },
  {
    name: "Elena Rodriguez",
    consultantId: "CON-98421",
    specialization: "Privacy Law (GDPR)",
    totalClients: 856,
    avgRating: 4.8,
    sentiment: "Positive",
    avatarClass: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400",
  },
  {
    name: "Sarah Jenkins",
    consultantId: "CON-77102",
    specialization: "M&A Advisory",
    totalClients: 412,
    avgRating: 5.0,
    sentiment: "Exceptional",
    avatarClass: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
  },
  {
    name: "Gregory Chen",
    consultantId: "CON-66591",
    specialization: "Operational Efficiency",
    totalClients: 590,
    avgRating: 4.7,
    sentiment: "Mixed",
    avatarClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  },
];

const sentimentClass: Record<Consultant["sentiment"], string> = {
  Exceptional:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  Positive:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  Mixed:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter((part) => part !== "Dr.")
    .map((part) => part.charAt(0))
    .join("");
}

export function ConsultantsTable({ totalRecords }: { totalRecords: number }) {
  const [page] = useState(1);

  return (
    <Card>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Consultant</th>
                <th className="py-2 pr-4 font-medium">Specialization</th>
                <th className="py-2 pr-4 font-medium">Total Clients</th>
                <th className="py-2 pr-4 font-medium">Avg Rating</th>
                <th className="py-2 pr-4 font-medium">Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {consultants.map((consultant) => (
                <tr
                  key={consultant.consultantId}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${consultant.avatarClass}`}
                      >
                        {initials(consultant.name)}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          {consultant.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ID: {consultant.consultantId}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-foreground">
                    {consultant.specialization}
                  </td>
                  <td className="py-3 pr-4 text-foreground">
                    {consultant.totalClients.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-1 text-foreground">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {consultant.avgRating.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant="outline"
                      className={sentimentClass[consultant.sentiment]}
                    >
                      {consultant.sentiment.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing 1-{consultants.length} of {totalRecords.toLocaleString()}{" "}
            consultants
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={page === 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {[1, 2, 3].map((n) => (
              <Button
                key={n}
                variant={page === n ? "default" : "outline"}
                size="icon-sm"
              >
                {n}
              </Button>
            ))}
            <span className="px-1">...</span>
            <Button variant="outline" size="icon-sm">
              25
            </Button>
            <Button variant="outline" size="icon-sm">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
