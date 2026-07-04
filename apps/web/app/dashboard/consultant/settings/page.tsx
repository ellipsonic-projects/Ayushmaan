"use client";

import { useAuth } from "@/lib/auth/context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Bell, LogOut } from "lucide-react";

export default function ConsultantSettings() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user || user.userType !== "consultant") {
    router.push("/auth/login");
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/");
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
            Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your account preferences and security
          </p>
        </div>

        <div className="space-y-6">
          {/* Password */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage your password and security settings
              </p>
              <Button variant="outline">Change Password</Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      Appointment Reminders
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Get notified before your appointments
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-5 w-5" />
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        New Booking Alerts
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Get notified when clients book sessions
                      </p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-5 w-5" />
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        Marketing Emails
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Receive updates and tips to grow your practice
                      </p>
                    </div>
                    <input type="checkbox" className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Management */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Account Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                  <p className="font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Account Status
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Active & Verified
                  </p>
                  <Button variant="outline" size="sm">
                    View Account Details
                  </Button>
                </div>

                <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                  <p className="font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Deactivate Account
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Temporarily disable your account
                  </p>
                  <Button variant="outline" size="sm">
                    Deactivate
                  </Button>
                </div>

                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Delete Account
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Permanently delete your account and data
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logout */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Log out of your account
              </p>
              <Button onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
