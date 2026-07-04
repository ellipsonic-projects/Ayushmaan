"use client";

import { useAuth } from "@/lib/auth/context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Upload } from "lucide-react";
import { useState } from "react";

export default function ConsultantProfile() {
  const { user } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  if (!user || user.userType !== "consultant") {
    router.push("/auth/login");
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    // API call would go here
    setTimeout(() => setSaving(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <span className="font-bold text-white">A</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">Ayushman</span>
            </Link>
            <Link href="/dashboard/consultant" className="text-blue-600 hover:text-blue-700">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Professional Profile
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your consultant profile and credentials
          </p>
        </div>

        <div className="space-y-8">
          {/* Profile Image */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  No Image
                </div>
                <div>
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Photo
                  </Button>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                    JPG, PNG or GIF (Max 5MB)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    defaultValue={user.firstName}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    defaultValue={user.lastName}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={user.email}
                  disabled
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Professional Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Licensed Clinical Psychologist"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  placeholder="15"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Bio
                </label>
                <textarea
                  placeholder="Tell clients about your expertise, approach, and specialties"
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Hourly Rate (USD)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 dark:text-slate-400">$</span>
                    <input
                      type="number"
                      placeholder="150"
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                    />
                    <span className="text-slate-600 dark:text-slate-400">/hour</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Timezone
                  </label>
                  <select className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <option>EST (UTC-5)</option>
                    <option>CST (UTC-6)</option>
                    <option>MST (UTC-7)</option>
                    <option>PST (UTC-8)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credentials */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Credentials & Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  No credentials added yet
                </p>
                <Button variant="outline">Add Credential</Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex gap-4 justify-end">
            <Button variant="outline" asChild>
              <Link href="/dashboard/consultant">Cancel</Link>
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
