"use client";

import { useAuth } from "@/lib/auth/context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin, Star, LogOut } from "lucide-react";

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user || user.userType !== "client") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="mb-4">Unauthorized access</p>
          <Button onClick={() => router.push("/auth/login")}>Go to Login</Button>
        </div>
      </div>
    );
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
              <span className="font-bold text-slate-900 dark:text-white">
                Ayushman
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {user.firstName} {user.lastName}
              </span>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome, {user.firstName}!
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Manage your consultations and book new sessions
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid gap-6 md:grid-cols-2 mb-12">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>Book a Consultation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Find and book sessions with verified consultants
              </p>
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <Link href="/browse-consultants">Browse Consultants</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle>My Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                View and manage your scheduled sessions
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/client/appointments">View All</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  No upcoming appointments
                </p>
                <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
                  <Link href="/browse-consultants">Book Your First Session</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-3 mt-12">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600 mb-2">0</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Sessions
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600 mb-2">0</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Hours Consulted
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600 mb-2">—</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Average Rating
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
