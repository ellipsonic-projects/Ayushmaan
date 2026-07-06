"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export function TenantOperationalSettings() {
  const [cutoff, setCutoff] = useState<number[]>([24]);
  const [autoApprove, setAutoApprove] = useState(false);

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Operational Settings
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Default Currency
            </Label>
            <Select defaultValue="inr">
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inr">INR (₹)</SelectItem>
                <SelectItem value="usd">USD ($)</SelectItem>
                <SelectItem value="eur">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Payout Cycle
            </Label>
            <Select defaultValue="monthly">
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">
              Booking Cutoff Hours
            </Label>
            <span className="text-xs font-medium text-foreground">
              {cutoff[0]} Hours
            </span>
          </div>
          <Slider
            min={1}
            max={72}
            step={1}
            value={cutoff}
            onValueChange={(value) =>
              setCutoff(Array.isArray(value) ? [...value] : [value])
            }
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Auto-Approve Bookings
            </p>
            <p className="text-xs text-muted-foreground">
              Bypass manual review for all incoming requests
            </p>
          </div>
          <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
        </div>
      </CardContent>
    </Card>
  );
}
