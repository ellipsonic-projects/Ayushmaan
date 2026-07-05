import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CapabilitiesSection } from "@/components/capabilities-section";

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
      <span className="text-lg font-semibold tracking-tight text-slate-900">
        Ayushman
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs font-medium tracking-widest text-blue-600">
      <span className="h-px w-8 bg-blue-600/40" />
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

const pricing = [
  {
    tier: "STANDARD",
    description: "For solo consultants getting started.",
    monthly: 20,
    annual: 10,
    featured: false,
  },
  {
    tier: "PRO",
    description: "For growing practices with multiple consultants.",
    monthly: 40,
    annual: 25,
    featured: true,
  },
  {
    tier: "ENTERPRISE",
    description: "For large, multi-tenant organizations.",
    monthly: 100,
    annual: 75,
    featured: false,
  },
] as const;

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
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,theme(colors.blue.100),transparent)] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-blue-100/70 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#capabilities" className="hover:text-blue-600">
              Capabilities
            </a>
            <a href="#faq" className="hover:text-blue-600">
              FAQ
            </a>
            <a href="#insights" className="hover:text-blue-600">
              Insights
            </a> 
           <a href="#pricing" className="hover:text-blue-600">
            Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/billing">Get in touch</Link>
            </Button>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              One trusted platform for every consultant your clients rely on.
            </h1>
          </div>
          <Card className="overflow-hidden border-blue-100 bg-white/60 shadow-sm">
            <div className="grid grid-cols-3 gap-2 p-4">
              <Card className="col-span-2 border-none shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-slate-400">
                    Today&apos;s briefing
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    4 sessions · 2 overdue tasks
                  </p>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-1.5 w-full rounded-full bg-blue-100" />
                    <div className="h-1.5 w-3/4 rounded-full bg-blue-100" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none bg-blue-600 text-white shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-blue-100">Case</p>
                  <p className="mt-2 text-sm font-semibold">AI recap ready</p>
                </CardContent>
              </Card>
              <Card className="col-span-3 border-none shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-slate-400">
                    Recurring series
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-6 flex-1 rounded-md ${
                          i < 2 ? "bg-blue-600" : "bg-blue-100"
                        }`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </Card>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="max-w-xl">
            <p className="text-lg leading-8 text-slate-600">
              Ayushman gives medical, legal, physiotherapy, IT, homeopathy,
              and astrology practices a single home for bookings, session
              notes, AI-assisted recaps, and client trust — with every
              tenant&apos;s data fully isolated from every other.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="default" className="justify-between">
                <Link href="#contact">
                  Get in touch
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <a href="#capabilities">
                  What We Do
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="self-end">
            <p className="text-xs font-medium tracking-widest text-slate-400">
              /BUILT FOR
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-slate-400">
              <span>MEDICAL</span>
              <span>LEGAL</span>
              <span>PHYSIOTHERAPY</span>
              <span>HOMEOPATHY</span>
              <span>ASTROLOGY</span>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section
        id="capabilities"
        className="mx-auto w-full max-w-6xl px-6 py-20"
      >
        <div className="grid gap-6 sm:grid-cols-2 sm:items-end">
          <div>
            <SectionLabel>OUR SERVICES</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
              Capabilities
            </h2>
          </div>
          <p className="text-sm leading-6 text-slate-500 sm:justify-self-end sm:max-w-sm">
            Every tenant gets the same core loop — booking, session logging,
            AI recap, and trust oversight — tuned to the way each profession
            actually works.
          </p>
        </div>

        <CapabilitiesSection />
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid gap-6 sm:grid-cols-2 sm:items-end">
          <div>
            <SectionLabel>PRICING</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
              Simple plans for every practice
            </h2>
          </div>
          <p className="text-sm leading-6 text-slate-500 sm:justify-self-end sm:max-w-sm">
            Pay monthly or save by billing annually. Upgrade or downgrade
            anytime as your practice grows.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {pricing.map((plan) => (
            <Card
              key={plan.tier}
              className={`flex flex-col border-blue-100 shadow-sm ${
                plan.featured ? "border-blue-600 ring-1 ring-blue-600" : ""
              }`}
            >
              <CardContent className="flex flex-1 flex-col p-6">
                <p className="text-xs font-medium tracking-widest text-blue-600">
                  {plan.tier}
                </p>
                <CardTitle className="mt-3">
                  ${plan.monthly}
                  <span className="text-sm font-normal text-slate-400">
                    {" "}
                    /mo
                  </span>
                </CardTitle>
                <CardDescription className="mt-2">
                  {plan.description}
                </CardDescription>
                <p className="mt-4 text-xs text-slate-400">
                  or ${plan.annual}/mo billed annually
                </p>
                <Button
                  asChild
                  variant={plan.featured ? "default" : "outline"}
                  className="mt-6 justify-between"
                >
                  <Link href="/billing">
                    Get started
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto w-full max-w-6xl px-6 py-20">
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
          Frequently Asked Questions
        </h2>

        <Accordion type="single" collapsible className="mt-8 border-t border-blue-100">
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="border-blue-100">
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
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
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
              <div className="aspect-4/3 rounded-xl bg-linear-to-br from-blue-600 to-slate-900" />
              <CardContent className="px-0 pb-0">
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span className="text-blue-600">{post.tag}</span>
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
      <footer id="contact" className="border-t border-blue-100 bg-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p className="text-sm text-slate-500">
            © 2026 Ayushman. Built for the consultants your clients trust.
          </p>
        </div>
      </footer>
    </div>
  );
}
