'use client';

import { useState, useMemo } from 'react';
import { useConsultants } from '@/lib/hooks/useConsultants';
import { useAuth } from '@/lib/auth/context';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Star } from 'lucide-react';

export default function BrowseConsultants() {
  const { user } = useAuth();
  const { consultants, loading, error } = useConsultants();
  const [search, setSearch] = useState('');

  if (!user) {
    redirect('/auth/login');
  }

  const filtered = useMemo(() => {
    if (!consultants) return [];
    return consultants.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.specialties?.some((s: string) => s.toLowerCase().includes(search.toLowerCase()))
    );
  }, [consultants, search]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard/client" className="text-sm text-muted-foreground hover:text-foreground mb-3 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-4">Find a Consultant</h1>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by name or specialty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading consultants...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load consultants</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No consultants found</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((consultant) => (
              <Card key={consultant.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{consultant.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{consultant.title}</p>
                    </div>
                    <p className="font-bold text-foreground flex-shrink-0">${consultant.hourlyRate}/hr</p>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3 flex flex-col">
                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="text-sm font-medium">{consultant.rating}</span>
                    <span className="text-xs text-muted-foreground">({consultant.reviews} reviews)</span>
                  </div>

                  {/* Specialties */}
                  {consultant.specialties && consultant.specialties.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {consultant.specialties.slice(0, 2).map((spec: string) => (
                        <Badge key={spec} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Bio */}
                  {consultant.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{consultant.bio}</p>
                  )}

                  {/* Booking */}
                  <Button asChild className="w-full mt-2">
                    <Link href={`/consultant/${consultant.id}`}>
                      View Profile & Book
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
