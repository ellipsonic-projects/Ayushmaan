import useSWR from 'swr';
import { api } from '@/lib/api/client';

interface Consultant {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  hourlyRate: number;
  rating: number;
  reviews: number;
  availability: string;
  timezone: string;
  bio?: string;
  image?: string;
}

const fetcher = (url: string) => api.get(url);

export function useConsultants() {
  const { data, error, isLoading } = useSWR<{ data: Consultant[] }>(
    '/api/consultants',
    fetcher
  );

  return {
    consultants: data?.data || [],
    isLoading,
    error,
  };
}

export function useConsultant(id: string | null) {
  const { data, error, isLoading } = useSWR<{ data: Consultant }>(
    id ? `/api/consultants/${id}` : null,
    fetcher
  );

  return {
    consultant: data?.data || null,
    isLoading,
    error,
  };
}

export function useConsultantAvailability(consultantId: string) {
  const { data, error, isLoading } = useSWR(
    `/api/availability/${consultantId}`,
    fetcher
  );

  return {
    availability: data?.data || [],
    isLoading,
    error,
  };
}

export function useConsultantCredentials(consultantId: string) {
  const { data, error, isLoading } = useSWR(
    `/api/consultants/${consultantId}/credentials`,
    fetcher
  );

  return {
    credentials: data?.data || [],
    isLoading,
    error,
  };
}

export function useConsultantReviews(consultantId: string) {
  const { data, error, isLoading } = useSWR(
    `/api/consultants/${consultantId}/reviews`,
    fetcher
  );

  return {
    reviews: data?.data || [],
    isLoading,
    error,
  };
}
