'use client';

import { useAuth } from '@/lib/auth/context';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();

  if (user) {
    const dashboardUrl = user.userType === 'consultant'
      ? '/dashboard/consultant'
      : '/dashboard/client';

    if (typeof window !== 'undefined') {
      window.location.href = dashboardUrl;
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg text-foreground flex items-center gap-2">
            <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center rounded text-sm font-bold">
              A
            </div>
            Ayushman
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="text-center space-y-8 max-w-3xl mx-auto">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
              Connect with Expert Consultants
            </h1>
            <p className="text-xl text-muted-foreground">
              Book confidential consultations instantly. Simple, secure, and verified professionals.
            </p>
          </div>
          <div className="flex gap-3 justify-center flex-col sm:flex-row pt-4">
            <Button asChild size="lg" className="sm:w-auto">
              <Link href="/auth/register?type=client">
                Browse Consultants
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="sm:w-auto">
              <Link href="/auth/register?type=consultant">
                Become a Consultant
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 py-20 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Find', desc: 'Browse verified consultants' },
              { step: '2', title: 'Book', desc: 'Choose available time slots' },
              { step: '3', title: 'Connect', desc: 'Start your consultation' },
            ].map((item) => (
              <div key={item.step} className="text-center space-y-3">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold mx-auto">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg text-foreground">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Why Ayushman</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            'Verified consultants with credentials',
            'Flexible scheduling, 24/7 availability',
            'Secure & confidential consultations',
            'Instant booking confirmation',
            'Professional verified profiles',
            'Support when you need it',
          ].map((feature, i) => (
            <Card key={i} className="border-border">
              <CardContent className="pt-6 flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{feature}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div>
            <h2 className="text-4xl font-bold mb-3">Ready to get started?</h2>
            <p className="text-lg opacity-90">
              Find the right consultant for your needs today.
            </p>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link href="/auth/register">Create Account</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Ayushman. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
