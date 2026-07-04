"use client";

import { useAuth } from "@/lib/auth/context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppointmentsList } from "@/components/appointments/AppointmentsList";

export default function ConsultantAppointments() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user || user.userType !== "consultant") {
    router.push("/auth/login");
    return null;
  }

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
            My Appointments
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            View and manage all your client consultations
          </p>
        </div>

        <AppointmentsList userRole="consultant" />
      </main>
    </div>
  );
}
