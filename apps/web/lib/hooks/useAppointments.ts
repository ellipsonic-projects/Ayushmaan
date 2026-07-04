import useSWR from 'swr';
import { useAuth } from '@/lib/auth/context';
import { api } from '@/lib/api/client';

interface Appointment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  consultantName?: string;
  clientName?: string;
  meetingLink?: string;
}

const fetcher = (url: string, token: string) =>
  api.get(url, token);

export function useAppointments() {
  const { token } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<{ data: Appointment[] }>(
    token ? ['/api/appointments', token] : null,
    ([url, token]) => fetcher(url, token)
  );

  return {
    appointments: data?.data || [],
    isLoading,
    error,
    mutate,
  };
}

export function useAppointment(id: string | null) {
  const { token } = useAuth();

  const { data, error, isLoading } = useSWR<{ data: Appointment }>(
    token && id ? [`/api/appointments/${id}`, token] : null,
    ([url, token]) => fetcher(url, token)
  );

  return {
    appointment: data?.data || null,
    isLoading,
    error,
  };
}

export async function createAppointment(
  token: string,
  appointmentData: {
    consultantId: string;
    startTime: string;
    endTime: string;
    title: string;
  }
) {
  return api.post('/api/appointments', appointmentData, token);
}

export async function cancelAppointment(token: string, appointmentId: string) {
  return api.post(`/api/appointments/${appointmentId}/cancel`, {}, token);
}
