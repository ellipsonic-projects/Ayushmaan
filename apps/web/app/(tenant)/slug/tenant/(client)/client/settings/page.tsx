import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const notificationPreferences = [
  {
    id: "email-reminders",
    label: "Email reminders",
    description: "Get an email before every upcoming appointment",
    defaultChecked: true,
  },
  {
    id: "sms-reminders",
    label: "SMS reminders",
    description: "Get a text message an hour before your session",
    defaultChecked: true,
  },
  {
    id: "document-alerts",
    label: "Document alerts",
    description: "Be notified when your care team shares a new document",
    defaultChecked: false,
  },
];

export default function ClientSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and notification preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your personal details shared with your care team
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="first-name">First name</Label>
            <Input id="first-name" defaultValue="Joker" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="last-name">Last name</Label>
            <Input id="last-name" defaultValue="Doe" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue="joker@example.com" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" defaultValue="+91 98765 43210" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Choose how you want to hear from us
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {notificationPreferences.map((pref) => (
            <div
              key={pref.id}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="leading-tight">
                <Label htmlFor={pref.id} className="text-sm font-medium">
                  {pref.label}
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {pref.description}
                </p>
              </div>
              <Switch id={pref.id} defaultChecked={pref.defaultChecked} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Save changes</Button>
      </div>
    </div>
  );
}
