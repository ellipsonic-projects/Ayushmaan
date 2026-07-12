"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Menu,
  Stethoscope,
  Scale,
  HeartPulse,
  Laptop2,
  Leaf,
  Sparkles,
  ClipboardList,
  UserPlus,
  CalendarCheck,
  TrendingUp,
  Quote,
} from "lucide-react";

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

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
        <rect width="30" height="30" rx="8" fill="#1F3B2C" />
        <path
          d="M9 21.5 14 8.5h2l5 13h-2.3l-1.15-3.1h-5.1L11.3 21.5H9Zm3.15-5h3.7L14 10.9l-1.85 5.6Z"
          fill="white"
        />
      </svg>
      <span className="font-display text-lg tracking-tight text-stone-900 dark:text-white">
        Ayushman
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs font-medium tracking-widest text-emerald-800 dark:text-emerald-400">
      <span className="h-px w-8 bg-emerald-800/40 dark:bg-emerald-400/40" />
      {children}
    </div>
  );
}

const industries = [
  { label: "Medical", description: "Clinics and physicians", icon: Stethoscope },
  { label: "Legal", description: "Advocates and firms", icon: Scale },
  { label: "Physiotherapy", description: "Rehab practices", icon: HeartPulse },
  { label: "IT Consulting", description: "Independent consultants", icon: Laptop2 },
  { label: "Homeopathy", description: "Alternative medicine", icon: Leaf },
  { label: "Astrology", description: "Personal advisory", icon: Sparkles },
];

const process = [
  {
    step: "01",
    title: "Onboard your practice",
    description:
      "Set up your branded workspace, business details, and billing in a single guided flow.",
    icon: ClipboardList,
  },
  {
    step: "02",
    title: "Invite your consultants",
    description:
      "Add each consultant with their own profile, fee, availability, and specialization.",
    icon: UserPlus,
  },
  {
    step: "03",
    title: "Clients book with confidence",
    description:
      "Clients see real availability and book directly — confirmations and reminders are automatic.",
    icon: CalendarCheck,
  },
  {
    step: "04",
    title: "Grow with clear insight",
    description:
      "Revenue, retention, and utilization surface on one dashboard, so decisions stay evidence-led.",
    icon: TrendingUp,
  },
];

const results = [
  { value: "1,200+", label: "Practices onboarded" },
  { value: "40%", label: "Fewer missed sessions" },
  { value: "100%", label: "Tenant data isolation" },
  { value: "4.8/5", label: "Average consultant rating" },
];

const testimonials = [
  {
    quote:
      "We moved six consultants and four years of client history over in an afternoon. Nothing felt like a compromise — it felt like the system we should have had from day one.",
    name: "Meera Iyer",
    role: "Tenant Admin, Iyer Family Practice",
  },
  {
    quote:
      "The session recaps alone changed how I show up for clients. I spend less time reconstructing what happened last time, and more time on what matters this time.",
    name: "Karan Walia",
    role: "Independent Legal Consultant",
  },
  {
    quote:
      "Booking used to be three phone calls and a paper diary. Now I see a slot, I take it, and I get a reminder the day before. It's calmer for everyone.",
    name: "Sarah Lawson",
    role: "Client",
  },
];

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
    <div className="relative flex min-h-screen flex-col text-stone-900 dark:text-stone-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-stone-50/80 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-stone-600 dark:text-stone-300 md:flex">
            <a href="#about" className="hover:text-emerald-800 dark:hover:text-emerald-400">
              About
            </a>
            <a href="#capabilities" className="hover:text-emerald-800 dark:hover:text-emerald-400">
              Services
            </a>
            <a href="#process" className="hover:text-emerald-800 dark:hover:text-emerald-400">
              Process
            </a>
            <a href="#faq" className="hover:text-emerald-800 dark:hover:text-emerald-400">
              FAQ
            </a>
            <a href="#pricing" className="hover:text-emerald-800 dark:hover:text-emerald-400">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/billing">Book a consultation</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signin">Sign in</Link>
            </Button>
            <Sheet>
              <SheetTrigger
                aria-label="Open menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800 dark:text-stone-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 md:hidden"
              >
                <Menu className="h-4 w-4" />
              </SheetTrigger>
              <SheetContent side="right" className="gap-6 bg-stone-50 px-6 py-8 dark:bg-stone-950">
                <SheetHeader className="p-0">
                  <SheetTitle>
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 text-base font-medium text-stone-700 dark:text-stone-200">
                  <SheetClose
                    render={
                      <a
                        href="#about"
                        className="rounded-md px-2 py-2 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                      />
                    }
                  >
                    About
                  </SheetClose>
                  <SheetClose
                    render={
                      <a
                        href="#capabilities"
                        className="rounded-md px-2 py-2 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                      />
                    }
                  >
                    Services
                  </SheetClose>
                  <SheetClose
                    render={
                      <a
                        href="#process"
                        className="rounded-md px-2 py-2 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                      />
                    }
                  >
                    Process
                  </SheetClose>
                  <SheetClose
                    render={
                      <a
                        href="#faq"
                        className="rounded-md px-2 py-2 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                      />
                    }
                  >
                    FAQ
                  </SheetClose>
                  <SheetClose
                    render={
                      <a
                        href="#pricing"
                        className="rounded-md px-2 py-2 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400"
                      />
                    }
                  >
                    Pricing
                  </SheetClose>
                </nav>
                <div className="mt-auto flex flex-col gap-2">
                  <Button asChild>
                    <Link href="/signin">Sign in</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/billing">Book a consultation</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div {...fadeUp} className="max-w-xl">
            <SectionLabel>PRACTICE MANAGEMENT, DONE CALMLY</SectionLabel>
            <h1 className="font-display mt-5 text-4xl font-normal leading-[1.15] tracking-tight text-stone-900 dark:text-white sm:text-5xl">
              One trusted platform for every consultant your clients rely on.
            </h1>
            <p className="mt-6 text-lg leading-8 text-stone-600 dark:text-stone-300">
              Ayushman gives medical, legal, physiotherapy, IT, homeopathy, and astrology practices
              a single, orderly home for bookings, session notes, and client trust — with every
              tenant&apos;s data fully isolated from every other.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="justify-between bg-emerald-900 hover:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-600"
              >
                <Link href="/billing">
                  Book a consultation
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="justify-between border-stone-300 dark:border-stone-700"
              >
                <a href="#process">
                  See how it works
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative aspect-4/5 overflow-hidden rounded-2xl border border-stone-200 shadow-sm dark:border-stone-800 sm:aspect-square lg:aspect-4/5">
              <Image
                src="/landing_page.jpg"
                alt="A consultant preparing notes ahead of a client session"
                fill
                priority
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 left-6 right-6 rounded-xl border border-stone-200 bg-white/95 p-5 shadow-md backdrop-blur-sm dark:border-stone-800 dark:bg-stone-900/95 sm:right-auto sm:w-72">
              <p className="font-display text-sm italic leading-6 text-stone-700 dark:text-stone-200">
                &ldquo;It felt like the system we should have had from day one.&rdquo;
              </p>
              <p className="mt-2 text-xs font-medium text-stone-400 dark:text-stone-500">
                Meera Iyer · Tenant Admin
              </p>
            </div>
          </motion.div>
        </div>

        {/* Trust bar */}
        <motion.div
          {...fadeUp}
          className="mt-20 border-t border-stone-200 pt-8 dark:border-stone-800"
        >
          <p className="text-xs font-medium tracking-widest text-stone-400 dark:text-stone-500">
            TRUSTED ACROSS EVERY PRACTICE TYPE
          </p>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium text-stone-500 dark:text-stone-400">
            <span>Medical</span>
            <span>Legal</span>
            <span>Physiotherapy</span>
            <span>IT Consulting</span>
            <span>Homeopathy</span>
            <span>Astrology</span>
          </div>
        </motion.div>
      </section>

      {/* About */}
      <section id="about" className="mx-auto w-full max-w-6xl px-6 py-20">
        <motion.div {...fadeUp} className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <SectionLabel>ABOUT AYUSHMAN</SectionLabel>
            <h2 className="font-display mt-4 text-3xl font-normal tracking-tight text-stone-900 dark:text-white">
              Built by people who understand practices, not just software.
            </h2>
          </div>
          <div className="space-y-5 text-base leading-7 text-stone-600 dark:text-stone-300">
            <p>
              Every practice we spoke with before building Ayushman had the same quiet frustration:
              booking tools built for one kind of business, forced onto a completely different one.
              A physician's calendar doesn't work like a lawyer's caseload. A homeopath's intake
              isn't a physiotherapist's treatment plan.
            </p>
            <p>
              So we built one platform with tenant isolation at its core — not bolted on. Each
              practice gets its own branded workspace, its own consultants, its own client
              relationships, and its own data boundary, enforced at the database level rather than
              trusted to application code.
            </p>
            <p className="font-display text-xl italic text-stone-800 dark:text-stone-100">
              The result is software that gets out of the way, so the work of consulting can stay
              the focus.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Services */}
      <section id="capabilities" className="mx-auto w-full max-w-6xl px-6 py-20">
        <motion.div {...fadeUp} className="grid gap-6 sm:grid-cols-2 sm:items-end">
          <div>
            <SectionLabel>SERVICES</SectionLabel>
            <h2 className="font-display mt-4 text-3xl font-normal tracking-tight text-stone-900 dark:text-white">
              What Ayushman handles for you
            </h2>
          </div>
          <p className="text-sm leading-6 text-stone-500 dark:text-stone-400 sm:justify-self-end sm:max-w-sm">
            Every tenant gets the same core loop — booking, session logging, AI recap, and trust
            oversight — tuned to the way each profession actually works.
          </p>
        </motion.div>

        <CapabilitiesSection />
      </section>

      {/* Industries served */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <motion.div {...fadeUp}>
          <SectionLabel>WHO WE SERVE</SectionLabel>
          <h2 className="font-display mt-4 text-3xl font-normal tracking-tight text-stone-900 dark:text-white">
            One platform, six kinds of practice
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((industry, i) => {
            const Icon = industry.icon;
            return (
              <motion.div
                key={industry.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
              >
                <Card className="flex-row items-center gap-4 border-stone-200 bg-white/70 p-5 dark:border-stone-800 dark:bg-stone-900/70">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-base text-stone-900 dark:text-white">
                      {industry.label}
                    </p>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      {industry.description}
                    </p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Process */}
      <section id="process" className="mx-auto w-full max-w-6xl px-6 py-20">
        <motion.div {...fadeUp}>
          <SectionLabel>PROCESS</SectionLabel>
          <h2 className="font-display mt-4 text-3xl font-normal tracking-tight text-stone-900 dark:text-white">
            How a practice comes on board
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {process.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
                className="relative"
              >
                <span className="font-display text-4xl text-stone-200 dark:text-stone-800">
                  {p.step}
                </span>
                <span className="mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="font-display mt-4 text-lg text-stone-900 dark:text-white">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
                  {p.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Results */}
      <section className="border-y border-stone-200 bg-white/60 dark:border-stone-800 dark:bg-stone-900/40">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-6 py-14 lg:grid-cols-4">
          {results.map((r, i) => (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
            >
              <p className="font-display text-4xl text-emerald-900 dark:text-emerald-400">
                {r.value}
              </p>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{r.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <motion.div {...fadeUp}>
          <SectionLabel>IN THEIR WORDS</SectionLabel>
          <h2 className="font-display mt-4 text-3xl font-normal tracking-tight text-stone-900 dark:text-white">
            What practices and clients say
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
            >
              <Card className="h-full border-stone-200 bg-white/70 p-6 dark:border-stone-800 dark:bg-stone-900/70">
                <Quote className="h-5 w-5 text-emerald-800/50 dark:text-emerald-400/50" />
                <p className="mt-4 text-sm leading-7 text-stone-700 dark:text-stone-200">
                  {t.quote}
                </p>
                <p className="mt-5 text-sm font-medium text-stone-900 dark:text-white">{t.name}</p>
                <p className="text-xs text-stone-400 dark:text-stone-500">{t.role}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto w-full max-w-6xl px-6 py-20">
        <motion.div {...fadeUp} className="grid gap-6 sm:grid-cols-2 sm:items-end">
          <div>
            <SectionLabel>PRICING</SectionLabel>
            <h2 className="font-display mt-4 text-3xl font-normal tracking-tight text-stone-900 dark:text-white">
              Simple plans for every practice
            </h2>
          </div>
          <p className="text-sm leading-6 text-stone-500 dark:text-stone-400 sm:justify-self-end sm:max-w-sm">
            Pay monthly or save by billing annually. Upgrade or downgrade anytime as your practice
            grows.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {pricing.map((plan, i) => (
            <motion.div
              key={plan.tier}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
            >
              <Card
                className={`relative flex h-full flex-col border-stone-200 shadow-sm dark:border-stone-800 ${
                  plan.featured
                    ? "border-emerald-900 ring-1 ring-emerald-900 dark:border-emerald-400 dark:ring-emerald-400"
                    : ""
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 right-6 rounded-full bg-emerald-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm dark:bg-emerald-700">
                    Most Chosen
                  </span>
                )}
                <CardContent className="flex flex-1 flex-col p-6">
                  <p className="text-xs font-medium tracking-widest text-emerald-800 dark:text-emerald-400">
                    {plan.tier}
                  </p>
                  <CardTitle className="font-display mt-3 text-3xl font-normal">
                    ${plan.monthly}
                    <span className="text-sm font-normal text-stone-400 dark:text-stone-500">
                      {" "}
                      /mo
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                  <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">
                    or ${plan.annual}/mo billed annually
                  </p>
                  <Button
                    asChild
                    variant={plan.featured ? "default" : "outline"}
                    className={`mt-6 justify-between ${plan.featured ? "bg-emerald-900 hover:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-600" : "border-stone-300 dark:border-stone-700"}`}
                  >
                    <Link href="/billing">
                      Get started
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto w-full max-w-6xl px-6 py-20">
        <motion.div {...fadeUp}>
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="font-display mt-4 text-3xl font-normal tracking-tight text-stone-900 dark:text-white">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <Accordion
          type="single"
          collapsible
          className="mt-8 border-t border-stone-200 dark:border-stone-800"
        >
          {faqs.map((f) => (
            <AccordionItem key={f.q} value={f.q} className="border-stone-200 dark:border-stone-800">
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Insights */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <motion.div {...fadeUp} className="flex items-end justify-between gap-4">
          <div>
            <SectionLabel>FROM THE TEAM</SectionLabel>
            <h2 className="font-display mt-4 text-3xl font-normal tracking-tight text-stone-900 dark:text-white">
              Latest insights
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden border-stone-300 sm:inline-flex dark:border-stone-700"
            asChild
          >
            <a href="#">
              Discover more
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        </motion.div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {insights.map((post, i) => (
            <motion.div
              key={post.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
            >
              <Card className="border-none bg-transparent shadow-none">
                <div className="aspect-4/3 rounded-xl bg-linear-to-br from-emerald-900 to-stone-800 dark:to-stone-700" />
                <CardContent className="px-0 pb-0">
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-stone-400 dark:text-stone-500">
                    <span className="text-emerald-800 dark:text-emerald-400">{post.tag}</span>
                    <span>/{post.date}</span>
                  </div>
                  <CardTitle className="font-display mt-2 font-normal">{post.title}</CardTitle>
                  <CardDescription className="mt-2">{post.blurb}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Consultation booking / contact */}
      <section id="contact" className="mx-auto w-full max-w-6xl px-6 py-20">
        <motion.div
          {...fadeUp}
          className="rounded-2xl border border-stone-200 bg-white/70 px-8 py-14 text-center dark:border-stone-800 dark:bg-stone-900/50 sm:px-16"
        >
          <div className="flex justify-center">
            <SectionLabel>GET STARTED</SectionLabel>
          </div>
          <h2 className="font-display mx-auto mt-4 max-w-xl text-3xl font-normal tracking-tight text-stone-900 dark:text-white">
            Ready to bring calm to your practice?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-stone-500 dark:text-stone-400">
            Tell us about your practice and we&apos;ll set up a short call to walk through
            onboarding — no pressure, no obligation.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-emerald-900 hover:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              <Link href="/billing">Book a consultation</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-stone-300 dark:border-stone-700"
            >
              <a href="mailto:hello@ayushman.health">Email us</a>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-50/80 dark:border-stone-800 dark:bg-stone-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p className="text-sm text-stone-500 dark:text-stone-400">
            © 2026 Ayushman. Built for the consultants your clients trust.
          </p>
        </div>
      </footer>
    </div>
  );
}
