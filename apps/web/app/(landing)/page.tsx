import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CapabilitiesSection } from "@/components/capabilities-section";
import { ThemeToggle } from "@/components/theme-toggle";

function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
        <rect width="30" height="30" rx="8" fill="#155DFC" />
        <path
          d="M9 21.5 14 8.5h2l5 13h-2.3l-1.15-3.1h-5.1L11.3 21.5H9Zm3.15-5h3.7L14 10.9l-1.85 5.6Z"
          fill="white"
        />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-foreground">Ayushman</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs font-medium tracking-widest text-primary">
      <span className="h-px w-8 bg-primary/40" />
      {children}
    </div>
  );
}

const faqs = [
  {
    q: "What is Ayushman?",
    a: "Ayushman is a multi-tenant practice platform for independent consultants — medical, legal, physiotherapy, IT, homeopathy, and astrology professionals — to manage clients, sessions, bookings, and payments in one place.",
  },
  {
    q: "Can one practice serve multiple consultants?",
    a: "Yes. A Tenant Admin manages a roster of Consultants under their own branded subdomain, each with their own client list, calendar, and case notes — while still sharing tenant-wide billing and settings.",
  },
  {
    q: "How is client data kept private between practices?",
    a: "Every table is tenant-scoped and enforced with Postgres row-level security, so a request can never read across tenants — even a coding mistake can't leak one practice's data into another's.",
  },
  {
    q: "What happens if a client has a concern about their consultant?",
    a: "Every client has a persistent, tenant-agnostic way to report a concern straight to Ayushman's platform team — a channel the tenant it's about cannot see, disable, or resolve on its own.",
  },
  {
    q: "Can clients book recurring sessions?",
    a: "Yes — a consultant or client can set up a recurring series (e.g. weekly for six weeks) in a single booking, with each occurrence still individually editable or cancellable.",
  },
  {
    q: "Is my private clinical or legal note ever used outside my case?",
    a: "No. AI retrieval is hard-scoped to your tenant and case, and only the portions a consultant explicitly marks as client-shared are ever visible to you — private notes stay private.",
  },
];

const reviews = [
  {
    name: "Dr. Meera Nair",
    role: "Physiotherapist",
    quote:
      "Session logging and recurring bookings used to eat my evenings. Now clients book, get reminders, and I get an AI recap ready before the next visit.",
  },
  {
    name: "Arjun Kapoor",
    role: "IT Consultant",
    quote:
      "Every client's history is isolated and searchable. Onboarding a new consultant to my practice took minutes, not days.",
  },
  {
    name: "Sana Iyer",
    role: "Legal Advocate",
    quote:
      "The trust and grievance oversight gave my clients confidence from day one. It feels built for how consultants actually work.",
  },
];

const insights = [
  {
    tag: "PRODUCT",
    date: "JUN 18, 2026",
    title: "Building recurring care into a single booking flow",
    blurb:
      "Physiotherapy and ongoing-therapy practices rarely book one slot at a time. Here's how we designed appointment series so a six-week plan is one action, not six.",
  },
  {
    tag: "TRUST & SAFETY",
    date: "MAY 29, 2026",
    title: "Why grievances need a channel the tenant can't see",
    blurb:
      "A reporting system a bad-actor admin can quietly read — or resolve — protects no one. We explain the design decision behind Ayushman's platform-level grievance channel.",
  },
  {
    tag: "INSIGHTS",
    date: "MAY 04, 2026",
    title: "Designing consult notes that clients actually read",
    blurb:
      "The gap between a consultant's private clinical note and the client-facing recap is where trust is won or lost. A look at how AI-assisted summaries bridge it.",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col text-foreground">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Image
          src="/landing_page.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-100 dark:opacity-30"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,color-mix(in_oklab,var(--primary)_15%,transparent),transparent)]" />
        <div className="absolute inset-0 bg-background/0 dark:bg-background/60" />
        <div className="animate-blob absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
        <div
          className="animate-blob absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-secondary/20 blur-3xl"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="animate-blob absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-accent/25 blur-3xl"
          style={{ animationDelay: "-12s" }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#capabilities" className="hover:text-primary">
              Capabilities
            </a>
            <a href="#faq" className="hover:text-primary">
              FAQ
            </a>
            <a href="#insights" className="hover:text-primary">
              Insights
            </a>
            <a href="#reviews" className="hover:text-primary">
              Reviews
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/billing">Get in touch</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signin">Sign in</Link>
            </Button>
            <Sheet>
              <SheetTrigger
                aria-label="Open menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary md:hidden"
              >
                <Menu className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent side="right" className="gap-6 px-6 py-8">
                <SheetHeader className="p-0">
                  <SheetTitle>
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 text-base font-medium text-foreground">
                  <SheetClose
                    render={
                      <a
                        href="#capabilities"
                        className="rounded-md px-2 py-2 hover:bg-primary/10 hover:text-primary"
                      />
                    }
                  >
                    Capabilities
                  </SheetClose>
                  <SheetClose
                    render={
                      <a
                        href="#faq"
                        className="rounded-md px-2 py-2 hover:bg-primary/10 hover:text-primary"
                      />
                    }
                  >
                    FAQ
                  </SheetClose>
                  <SheetClose
                    render={
                      <a
                        href="#insights"
                        className="rounded-md px-2 py-2 hover:bg-primary/10 hover:text-primary"
                      />
                    }
                  >
                    Insights
                  </SheetClose>
                  <SheetClose
                    render={
                      <a
                        href="#reviews"
                        className="rounded-md px-2 py-2 hover:bg-primary/10 hover:text-primary"
                      />
                    }
                  >
                    Reviews
                  </SheetClose>
                </nav>
                <div className="mt-auto flex flex-col gap-2">
                  <Button asChild>
                    <Link href="/signin">Sign in</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/billing">Get in touch</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="flex max-w-xl flex-col justify-center">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              Coordinate with confidence
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Connect with peer consultants and clients on one unified platform. Manage projects,
              share updates, and collaborate seamlessly.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="default" className="justify-between">
                <Link href="/billing">
                  Start Free Trial
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <a href="#capabilities">
                  View Demo
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-xs font-medium tracking-widest text-primary">/BUILT FOR</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-foreground">
                <span>MEDICAL</span>
                <span>LEGAL</span>
                <span>PHYSIOTHERAPY</span>
                <span>HOMEOPATHY</span>
                <span>ASTROLOGY</span>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden border-border bg-card/60 shadow-sm">
            <div className="grid grid-cols-3 gap-2 p-4">
              <Card className="col-span-2 border-none shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground">Today&apos;s briefing</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    4 sessions · 2 overdue tasks
                  </p>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-1.5 w-full rounded-full bg-primary/15" />
                    <div className="h-1.5 w-3/4 rounded-full bg-primary/15" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none bg-primary text-primary-foreground shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-primary-foreground/70">Case</p>
                  <p className="mt-2 text-sm font-semibold">AI recap ready</p>
                </CardContent>
              </Card>
              <Card className="col-span-3 border-none shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground">Recurring series</p>
                  <div className="mt-2 flex gap-1.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-6 flex-1 rounded-md ${
                          i < 2 ? "bg-primary" : "bg-primary/15"
                        }`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </Card>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid gap-6 sm:grid-cols-2 sm:items-end">
          <div>
            <SectionLabel>OUR SERVICES</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              Capabilities
            </h2>
          </div>
          <p className="text-sm leading-6 text-muted-foreground sm:justify-self-end sm:max-w-sm">
            Every tenant gets the same core loop — booking, session logging, AI recap, and trust
            oversight — tuned to the way each profession actually works.
          </p>
        </div>

        <CapabilitiesSection />
      </section>

      {/* Reviews */}
      <section id="reviews" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid gap-6 sm:grid-cols-2 sm:items-end">
          <div>
            <SectionLabel>REVIEWS</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              What consultants say
            </h2>
          </div>
          <p className="text-sm leading-6 text-muted-foreground sm:justify-self-end sm:max-w-sm">
            Real feedback from the consultants running their practice on Ayushman.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {reviews.map((review) => (
            <Card key={review.name} className="flex flex-col shadow-sm">
              <CardContent className="flex flex-1 flex-col p-6">
                <CardDescription className="flex-1 text-muted-foreground">
                  &ldquo;{review.quote}&rdquo;
                </CardDescription>
                <p className="mt-6 text-sm font-semibold text-foreground">{review.name}</p>
                <p className="text-xs text-muted-foreground">{review.role}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto w-full max-w-6xl px-6 py-20">
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          Frequently Asked Questions
        </h2>

        <Accordion type="single" collapsible className="mt-8 border-t border-border">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="border-border">
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Insights */}
      <section id="insights" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <SectionLabel>FROM THE TEAM</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              Latest insights
            </h2>
          </div>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
            <a href="#">
              Discover more
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {insights.map((post) => (
            <Card key={post.title} className="border-none bg-transparent shadow-none">
              <div className="aspect-4/3 rounded-xl bg-linear-to-br from-primary to-foreground" />
              <CardContent className="px-0 pb-0">
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="text-primary">{post.tag}</span>
                  <span>/{post.date}</span>
                </div>
                <CardTitle className="mt-2">{post.title}</CardTitle>
                <CardDescription className="mt-2">{post.blurb}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-border bg-background/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p className="text-sm text-muted-foreground">
            © 2026 Ayushman. Built for the consultants your clients trust.
            <Link
              href="/signin"
              aria-label="Superadmin sign in"
              className="ml-1 text-muted-foreground/20 no-underline hover:text-muted-foreground"
            >
              &middot;
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
