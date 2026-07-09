import { Cloud } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STREAK_DAYS = 12;
const STREAK_DOTS = 6;
const FILLED_DOTS = 5;

export function GreetingHeader({
  name = "Aris",
  date = "Tuesday, October 24th, 2023",
}: {
  name?: string;
  date?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Good Morning, {name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{date}</p>
      </div>
    </div>
  );
}
