'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/context';
import { api } from '@/lib/api/client';

interface Appointment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  consultant: { first_name: string; last_name: string };
  client: { first_name: string; last_name: string };
  meetingLink?: string;
  notes?: string;
}

export default function AppointmentDetail() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const id = params.id as string;
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!token) return;
      
      try {
        const data = await api.get(`/api/appointments/${id}`, token);
        setAppointment(data.data);
      } catch (error) {
        console.error('[v0] Failed to fetch appointment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [id, token]);

  const handleCancel = async () => {
    if (!token || !appointment) return;
    
    setCancelling(true);
    try {
      await api.post(`/api/appointments/${appointment.id}/cancel`, {}, token);
      alert('Appointment cancelled successfully');
      router.push('/dashboard/client/appointments');
    } catch (error) {
      console.error('[v0] Failed to cancel appointment:', error);
      alert('Failed to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading appointment...</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Appointment not found</p>
          <Link href="/dashboard/client/appointments">
            <Button>Back to Appointments</Button>
          </Link>
        </div>
      </div>
    );
  }

  const startDate = new Date(appointment.startTime);
  const endDate = new Date(appointment.endTime);
  const isConsultant = user?.userType === 'consultant';
  const isClient = user?.userType === 'client';
  const isPastAppointment = endDate < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <span className="font-bold text-white">A</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">Ayushman</span>
            </Link>
            <Link href={isConsultant ? "/dashboard/consultant" : "/dashboard/client"}>
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {appointment.title}
            </h1>
            <div className="flex items-center gap-2">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                appointment.status === 'confirmed' 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : appointment.status === 'cancelled'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-b border-slate-200 dark:border-slate-700 py-6">
            {/* Date & Time */}
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Date & Time</p>
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                {startDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                {startDate.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  hour12: true 
                })} - {endDate.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  hour12: true 
                })}
              </p>
            </div>

            {/* Duration */}
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Duration</p>
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                {Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))} minutes
              </p>
            </div>

            {/* Consultant */}
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Consultant</p>
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                {appointment.consultant.first_name} {appointment.consultant.last_name}
              </p>
            </div>

            {/* Client */}
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Client</p>
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                {appointment.client.first_name} {appointment.client.last_name}
              </p>
            </div>
          </div>

          {/* Meeting Link */}
          {appointment.meetingLink && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Meeting Link</p>
              <a 
                href={appointment.meetingLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                {appointment.meetingLink}
              </a>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Notes</p>
              <p className="text-slate-700 dark:text-slate-300">{appointment.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            {!isPastAppointment && appointment.status !== 'cancelled' && isClient && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelling}
                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
              </Button>
            )}
            
            <Link href={isConsultant ? "/dashboard/consultant" : "/dashboard/client"} className="ml-auto">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
