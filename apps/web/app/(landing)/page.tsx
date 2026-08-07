import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Clock3,
  FileText,
  LockKeyhole,
  MessageSquareText,
  Mic2,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Reveal, RevealGroup, RevealItem } from "@/components/landing/reveal";

function Logo() {
  return (
    <Link href="/" className="inline-flex items-center" aria-label="Ayushman home">
      <Image
        src="/logo.jpeg"
        alt="Ayushman"
        width={1368}
        height={768}
        priority
        className="h-10 w-auto rounded-md object-contain sm:h-12"
      />
    </Link>
  );
}

function SectionMark({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 font-(--font-landing-mono) text-[0.7rem] tracking-[0.22em] text-[#1f49ff] uppercase">
      <span className="h-px w-10 bg-[#1f49ff]" />
      {children}
    </div>
  );
}

const proof = [
  "For Consultants managing client relationships across sessions",
  "For Clients who need tasks, reminders, files, and summaries in one place",
  "For practices that need privacy boundaries without operational friction",
];

const builtFor = ["Medical", "Legal", "Physiotherapy", "Homeopathy", "Astrology"];

const workflow = [
  {
    icon: CalendarCheck2,
    title: "Book with context",
    body: "Clients choose appointments, recurring sessions, dependents, and reminders without a back-office chase.",
  },
  {
    icon: Mic2,
    title: "Capture the session",
    body: "Consultants record audio, write notes, attach documents, and keep private thinking separate from shared summaries.",
  },
  {
    icon: MessageSquareText,
    title: "Track promises",
    body: "Commitments become dated tasks, email nudges, and client-facing next steps.",
  },
  {
    icon: Sparkles,
    title: "Return prepared",
    body: "A morning brief recaps appointments, overdue work, unread messages, and the thread of each case.",
  },
];

const features = [
  {
    icon: Clock3,
    title: "Consultant morning brief",
    body: "Today's appointments, overdue commitments, unread messages, and AI recaps before the first session starts.",
  },
  {
    icon: FileText,
    title: "Chronological case timeline",
    body: "Interactions, notes, documents, tasks, payments, and client-visible summaries stay attached to the right case.",
  },
  {
    icon: LockKeyhole,
    title: "Tenant-safe privacy",
    body: "Four roles, tenant-scoped data, and hard boundaries between private consultant notes and client-shared records.",
  },
  {
    icon: ShieldCheck,
    title: "Client trust channel",
    body: "Clients can raise concerns to the platform team through a channel their tenant cannot hide or quietly close.",
  },
];

const faqs = [
  {
    q: "Is Ayushman for Consultants, Clients, or both?",
    a: "Both. Consultants use Ayushman to manage cases, sessions, notes, documents, commitments, bookings, and client communication. Clients use it to book, track assigned tasks, receive reminders, upload documents, and view shared summaries.",
  },
  {
    q: "What does a Consultant see every day?",
    a: "A Consultant gets a working view of today's appointments, case context, overdue commitments, unread client messages, quick note capture, session records, private notes, and AI-assisted recaps before the next meeting.",
  },
  {
    q: "What does a Client see between sessions?",
    a: "A Client sees their upcoming appointments, tasks due, shared documents, session summaries, receipts, reminders, and the parts of the case timeline the Consultant has marked as client-visible.",
  },
  {
    q: "Can multiple Consultants work under one practice?",
    a: "Yes. A Tenant Admin can manage Consultants, branding, billing, settings, and oversight while every Consultant keeps their own calendar, client list, case notes, and role-scoped access.",
  },
  {
    q: "How are Consultant notes and Client records separated?",
    a: "Ayushman separates private Consultant notes from Client-visible summaries and documents. Access is role-aware and tenant-scoped, so Clients only see what is intended for them.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-black dark:bg-black dark:text-white">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.32] dark:opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_76%_16%,rgba(31,73,255,0.22),transparent_34%)]" />

      <main>
        <section className="relative isolate mx-auto min-h-168 w-full overflow-hidden border-b border-black dark:border-white/20">
          <header className="absolute inset-x-0 top-0 z-30">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
              <Logo />
              <div className="flex items-center gap-2 sm:gap-3">
                <ThemeToggle />
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-full border-white/20 bg-white/8 px-4 text-white backdrop-blur-md hover:border-white/40 hover:bg-white/14 dark:border-white/20 dark:bg-black/20 dark:text-white dark:hover:border-white/30 dark:hover:bg-black/30"
                >
                  <Link href="/signin">Login</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="h-10 rounded-full bg-[#1f49ff] px-4 text-white hover:bg-[#1738c8] dark:bg-[#6f8dff] dark:text-black dark:hover:bg-[#9eb2ff]"
                >
                  <Link href="/signup">Signup</Link>
                </Button>
              </div>
            </div>
          </header>

          <Image
            src="/consultants.jpg"
            alt="Consultant and client in a working session"
            fill
            priority
            className="pointer-events-none absolute inset-0 z-0 object-cover object-[62%_38%]"
          />
          <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(100deg,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.82)_38%,rgba(0,0,0,0.42)_64%,rgba(0,0,0,0.18)_100%)]" />

          <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 pt-28 pb-16 sm:px-8 sm:pt-32 lg:min-h-168 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:pt-36 lg:pb-16">
            <Reveal>
              <SectionMark>Consultant-client continuity</SectionMark>
              <h1 className="font-display mt-7 max-w-3xl text-[clamp(3rem,7.5vw,6.5rem)] leading-[0.9] font-extrabold tracking-[-0.04em] text-balance text-white">
                Every case keeps its memory.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/74">
                Ayushman gives Consultants and Clients a formal shared timeline for sessions,
                commitments, documents, reminders, summaries, and trust events, so the work
                continues cleanly after every appointment.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full bg-[#1f49ff] px-6 text-base text-white shadow-[0_12px_34px_rgba(31,73,255,0.4)] hover:bg-[#1738c8]"
                >
                  <Link href="/signup">
                    Get Started
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full border-white/30 bg-white/10 px-6 text-base text-white backdrop-blur hover:border-white hover:bg-white/20"
                >
                  <Link href="/signin">Login</Link>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="relative w-full max-w-xs border border-white/80 bg-black/55 p-4 shadow-[14px_14px_0_#1f49ff] backdrop-blur-md sm:max-w-sm">
                <div className="border border-white/50 p-4">
                  <p className="font-(--font-landing-mono) text-[0.68rem] tracking-[0.2em] text-[#6f8dff] uppercase">
                    Live case rail
                  </p>
                  <p className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-white">
                    Consultant view
                  </p>
                  <div className="mt-6 h-2 w-full bg-white/15">
                    <div className="h-full w-2/3 bg-[#1f49ff]" />
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-white/85">
                  {[
                    "09:00 Morning brief prepared",
                    "12:30 Client task due today",
                    "17:10 Session summary ready for export",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 border-t border-white/15 pt-2"
                    >
                      <Check className="size-4 text-[#6f8dff]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="border-y border-black/10 bg-white py-14 dark:border-white/15 dark:bg-black">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <Reveal>
              <SectionMark>Built for</SectionMark>
              <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <h2 className="font-display max-w-2xl text-3xl leading-tight font-normal text-black sm:text-4xl dark:text-white">
                  Practices that need a structured timeline, clear handoffs, and a readable record.
                </h2>
                <p className="max-w-xl text-sm leading-6 text-black/68 dark:text-white/72">
                  Designed to work across consultant-led workflows where continuity matters as much
                  as speed.
                </p>
              </div>
            </Reveal>

            <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {builtFor.map((item, index) => (
                <RevealItem key={item}>
                  <article className="flex h-full min-h-28 flex-col justify-between border border-black/10 bg-[#f5f7ff] p-5 shadow-[6px_6px_0_rgba(31,73,255,0.10)] transition-colors hover:bg-white dark:border-white/15 dark:bg-[#07123d] dark:hover:bg-[#0b173f]">
                    <span className="font-(--font-landing-mono) text-[0.7rem] tracking-[0.22em] text-[#1f49ff] uppercase">
                      0{index + 1}
                    </span>
                    <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-black dark:text-white">
                      {item}
                    </p>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        <section className="border-y border-black/10 bg-[#f5f7ff] py-16 dark:border-white/15 dark:bg-[#050916]">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 lg:grid-cols-[18rem_1fr] lg:px-10">
            <div>
              <SectionMark>Social proof</SectionMark>
              <p className="mt-3 text-2xl font-semibold text-black dark:text-white">
                Built for serious practices.
              </p>
              <p className="mt-4 max-w-sm text-sm leading-6 text-black/68 dark:text-white/72">
                Designed for teams that need continuity, privacy, and a lower-friction handoff
                between sessions.
              </p>
            </div>
            <RevealGroup className="grid gap-4 md:grid-cols-3">
              {proof.map((item, index) => (
                <RevealItem key={item}>
                  <article className="h-full border border-black/10 bg-white p-5 shadow-[8px_8px_0_rgba(31,73,255,0.12)] transition-colors hover:bg-[#f3f6ff] dark:border-white/15 dark:bg-black dark:hover:bg-[#07123d]">
                    <div className="flex items-start gap-3">
                      <Star className="mt-1 size-4 shrink-0 text-[#1f49ff] dark:text-[#6f8dff]" />
                      <div>
                        <p className="font-(--font-landing-mono) text-[0.7rem] tracking-[0.22em] text-[#1f49ff] uppercase">
                          0{index + 1}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-black dark:text-white">{item}</p>
                      </div>
                    </div>
                  </article>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <Reveal>
            <SectionMark>Compact workflow</SectionMark>
            <h2 className="font-display mt-5 max-w-2xl text-4xl leading-tight font-normal text-black dark:text-white sm:text-5xl">
              The whole practice loop, compressed into four calm moves.
            </h2>
          </Reveal>
          <RevealGroup className="mt-12 grid gap-px overflow-hidden border border-black bg-black md:grid-cols-4 dark:border-white dark:bg-white">
            {workflow.map((step, index) => {
              const Icon = step.icon;
              return (
                <RevealItem key={step.title}>
                  <article className="min-h-72 bg-white p-6 transition-colors hover:bg-[#f3f6ff] dark:bg-black dark:hover:bg-[#07123d]">
                    <div className="flex items-start justify-between">
                      <Icon className="size-6 text-[#1f49ff] dark:text-[#6f8dff]" />
                      <span className="font-(--font-landing-mono) text-5xl leading-none text-black/10 dark:text-white/10">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="mt-12 text-xl font-semibold text-black dark:text-white">
                      {step.title}
                    </h3>
                    <p className="mt-4 text-sm leading-6 text-black/68 dark:text-white/72">
                      {step.body}
                    </p>
                  </article>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </section>

        <section className="relative isolate h-104 overflow-hidden border-y border-black dark:border-white/20">
          <Image
            src="/landing_page.jpg"
            alt="Consultants reviewing a case together"
            fill
            className="pointer-events-none absolute inset-0 -z-20 object-cover object-[62%_40%] grayscale"
          />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-black/62" />
          <div className="relative z-20 mx-auto flex h-full max-w-7xl items-center px-5 sm:px-8 lg:px-10">
            <Reveal>
              <p className="font-display max-w-3xl text-3xl leading-tight font-normal text-white sm:text-4xl">
                &ldquo;The case doesn&rsquo;t reset every time we sit down. It just
                <span className="text-[#6f8dff]"> continues.</span>&rdquo;
              </p>
              <p className="font-(--font-landing-mono) mt-6 text-[0.7rem] tracking-[0.22em] text-white/72 uppercase">
                How consultants describe the timeline
              </p>
            </Reveal>
          </div>
        </section>

        <section className="border-y border-black/10 bg-[#f5f7ff] py-20 dark:border-white/12 dark:bg-[#050916]">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <Reveal>
              <SectionMark>Features</SectionMark>
              <h2 className="font-display mt-5 max-w-3xl text-4xl leading-tight font-normal sm:text-5xl">
                Useful where consultants feel the work most: before, during, and after sessions.
              </h2>
            </Reveal>
            <RevealGroup className="mt-12 grid gap-5 md:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <RevealItem key={feature.title}>
                    <article className="grid h-full grid-cols-[3rem_1fr] gap-5 border border-black bg-white p-6 shadow-[8px_8px_0_rgba(31,73,255,0.18)] dark:border-white dark:bg-black">
                      <div className="flex size-12 items-center justify-center rounded-full bg-[#1f49ff] text-white dark:bg-[#6f8dff] dark:text-black">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{feature.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-black/72 dark:text-white/76">
                          {feature.body}
                        </p>
                      </div>
                    </article>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.78fr_1fr] lg:px-10">
          <Reveal>
            <SectionMark>FAQ</SectionMark>
            <h2 className="font-display mt-5 text-4xl leading-tight font-normal sm:text-5xl">
              Clear answers for a trust-heavy product.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-black/68 dark:text-white/72">
              The product is designed around role boundaries, client visibility, consultant speed,
              and careful continuity across long-running cases.
            </p>
          </Reveal>
          <Reveal>
            <Accordion
              type="single"
              collapsible
              className="border-t border-black/15 dark:border-white/15"
            >
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.q}
                  value={faq.q}
                  className="border-black/15 dark:border-white/15"
                >
                  <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-base leading-7 text-black/68 dark:text-white/72">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-black/15 bg-white dark:border-white/15 dark:bg-black">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <Logo />
          <div className="flex flex-col gap-3 text-sm text-black/68 sm:items-end dark:text-white/72">
            <p>© 2026 Ayushman. Formal continuity for consultant-led care.</p>
            <div className="flex gap-3">
              <Link href="/signin" className="hover:text-[#1f49ff] dark:hover:text-[#6f8dff]">
                Login
              </Link>
              <Link href="/billing" className="hover:text-[#1f49ff] dark:hover:text-[#6f8dff]">
                Signup
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
