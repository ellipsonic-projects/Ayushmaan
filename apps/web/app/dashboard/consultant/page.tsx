"use client";

import { useAuth } from "@/lib/auth/context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Users, Star, LogOut, Settings } from "lucide-react";

export default function ConsultantDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user || user.userType !== "consultant") {
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
                asChild
                variant="ghost"
                size="sm"
              >
                <Link href="/dashboard/consultant/settings" className="gap-2">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
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
            Welcome, Dr. {user.lastName}!
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Manage your consultations and availability
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Manage your availability and time slots
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/consultant/availability">Manage Schedule</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                View and manage client sessions
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/consultant/appointments">View All</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Edit your professional profile
              </p>
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <Link href="/dashboard/consultant/profile">Edit Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Consultations */}
        <Card className="border-slate-200 dark:border-slate-800 mb-12">
          <CardHeader>
            <CardTitle>Today&apos;s Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                No consultations scheduled for today
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600 mb-2">0</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Consultations
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600 mb-2">0h</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Hours Completed
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

          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600 mb-2">$0</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Earnings
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
