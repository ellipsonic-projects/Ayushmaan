'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookingForm } from '@/components/booking/BookingForm';
import { api } from '@/lib/api/client';

interface ConsultantDetail {
  id: string;
  name: string;
  title: string;
  bio: string;
  hourlyRate: number;
  rating: number;
  reviews: number;
  specialties: string[];
  timezone: string;
  profileImageUrl?: string;
  credentials?: Array<{
    id: string;
    title: string;
    issuer: string;
    year: number;
  }>;
}

export default function ConsultantDetail() {
  const params = useParams();
  const id = params.id as string;
  const [consultant, setConsultant] = useState<ConsultantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    const fetchConsultant = async () => {
      try {
        const data = await api.get(`/api/consultants/${id}`);
        setConsultant(data.data);
      } catch (error) {
        console.error('[v0] Failed to fetch consultant:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultant();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading consultant profile...</p>
      </div>
    );
  }

  if (!consultant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Consultant not found</p>
          <Link href="/browse-consultants">
            <Button>Back to Consultants</Button>
          </Link>
        </div>
      </div>
    );
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
            <Link href="/browse-consultants">
              <Button variant="outline">Back to Consultants</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column - Profile */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex gap-6 mb-6">
                <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
                  {consultant.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    {consultant.name}
                  </h1>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
                    {consultant.title}
                  </p>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        ${consultant.hourlyRate}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">per hour</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {consultant.rating.toFixed(1)}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        ({consultant.reviews} reviews)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Bio */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">About</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {consultant.bio || 'No bio available'}
              </p>
            </Card>

            {/* Specialties */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Specialties</h2>
              <div className="flex flex-wrap gap-2">
                {consultant.specialties?.map((specialty) => (
                  <span
                    key={specialty}
                    className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </Card>

            {/* Credentials */}
            {consultant.credentials && consultant.credentials.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Credentials</h2>
                <div className="space-y-3">
                  {consultant.credentials.map((cred) => (
                    <div key={cred.id} className="border-l-4 border-blue-500 pl-4">
                      <p className="font-medium text-slate-900 dark:text-white">{cred.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {cred.issuer} • {cred.year}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Additional Info */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Details</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Timezone:</span>
                  <span className="text-slate-900 dark:text-white font-medium">{consultant.timezone}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right column - Booking */}
          <div className="lg:col-span-1">
            {!showBooking ? (
              <Button
                onClick={() => setShowBooking(true)}
                className="w-full mb-4 h-12 text-base"
              >
                Book Consultation
              </Button>
            ) : (
              <>
                <BookingForm
                  consultantId={consultant.id}
                  consultantName={consultant.name}
                  onSuccess={() => setShowBooking(false)}
                />
                <Button
                  variant="outline"
                  onClick={() => setShowBooking(false)}
                  className="w-full mt-3"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
