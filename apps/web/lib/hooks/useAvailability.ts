import useSWR from 'swr';
import { useAuth } from '@/lib/auth/context';
import { api } from '@/lib/api/client';

interface AvailabilityWindow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface BlackoutDate {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

const fetcher = (url: string, token?: string) =>
  api.get(url, token);

export function useAvailability(consultantId: string) {
  const { data, error, isLoading } = useSWR<{ data: AvailabilityWindow[] }>(
    `/api/availability/${consultantId}`,
    (url) => fetcher(url)
  );

  return {
    availability: data?.data || [],
    isLoading,
    error,
  };
}

export function useBlackoutDates(consultantId: string) {
  const { data, error, isLoading } = useSWR<{ data: BlackoutDate[] }>(
    `/api/availability/${consultantId}/blackout`,
    (url) => fetcher(url)
  );

  return {
    blackoutDates: data?.data || [],
    isLoading,
    error,
  };
}

export function useMyAvailability() {
  const { token } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<
    { data: AvailabilityWindow[] }
  >(token ? ['/api/availability/my', token] : null, ([url, token]) =>
    fetcher(url, token)
  );

  return {
    availability: data?.data || [],
    isLoading,
    error,
    mutate,
  };
}

export function useMyBlackoutDates() {
  const { token } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<{ data: BlackoutDate[] }>(
    token ? ['/api/availability/my/blackout', token] : null,
    ([url, token]) => fetcher(url, token)
  );

  return {
    blackoutDates: data?.data || [],
    isLoading,
    error,
    mutate,
  };
}

export async function createAvailability(
  token: string,
  data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }
) {
  return api.post('/api/availability', data, token);
}

export async function deleteAvailability(token: string, id: string) {
  return api.delete(`/api/availability/${id}`, token);
}

export async function addBlackoutDate(
  token: string,
  consultantId: string,
  data: {
    startDate: string;
    endDate: string;
    reason?: string;
  }
) {
  return api.post(`/api/availability/${consultantId}/blackout`, data, token);
}

export async function getAvailableSlots(
  consultantId: string,
  startDate: string,
  endDate: string
) {
  return api.post(
    `/api/availability/${consultantId}/slots?startDate=${startDate}&endDate=${endDate}`,
    {},
  );
}
