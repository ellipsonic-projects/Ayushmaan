"use client";

import { motion } from "motion/react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function TenantIllustration() {
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full">
      <rect x="8" y="34" width="26" height="38" rx="4" fill="#dbeafe" />
      <rect x="47" y="20" width="26" height="52" rx="4" fill="#2563eb" />
      <rect x="86" y="40" width="26" height="32" rx="4" fill="#bfdbfe" />
      <circle cx="60" cy="10" r="6" fill="#1d4ed8" />
      <circle cx="21" cy="24" r="4" fill="#93c5fd" />
      <circle cx="99" cy="30" r="4" fill="#93c5fd" />
    </svg>
  );
}

function IsolationIllustration() {
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full">
      <rect x="10" y="14" width="44" height="52" rx="10" fill="#dbeafe" />
      <rect x="66" y="14" width="44" height="52" rx="10" fill="#eff6ff" />
      <path d="M60 14v52" stroke="#93c5fd" strokeWidth="2" strokeDasharray="4 4" />
      <rect x="24" y="32" width="16" height="16" rx="4" fill="#2563eb" />
      <rect x="80" y="32" width="16" height="16" rx="4" fill="#60a5fa" />
    </svg>
  );
}

function TimelineIllustration() {
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full">
      <path
        d="M14 60 34 40 54 52 76 26 106 20"
        fill="none"
        stroke="#2563eb"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="60" r="4" fill="#1d4ed8" />
      <circle cx="34" cy="40" r="4" fill="#1d4ed8" />
      <circle cx="54" cy="52" r="4" fill="#1d4ed8" />
      <circle cx="76" cy="26" r="4" fill="#1d4ed8" />
      <circle cx="106" cy="20" r="5" fill="#60a5fa" />
      <rect x="90" y="34" width="26" height="14" rx="4" fill="#dbeafe" />
    </svg>
  );
}

function SeriesIllustration() {
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full">
      {Array.from({ length: 6 }).map((_, i) => (
        <rect
          key={i}
          x={10 + i * 17}
          y={i < 2 ? 20 : 34}
          width="12"
          height={i < 2 ? 46 : 32}
          rx="3"
          fill={i < 2 ? "#2563eb" : "#dbeafe"}
        />
      ))}
    </svg>
  );
}

function TrustIllustration() {
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full">
      <path d="M60 10 96 22v20c0 22-15 32-36 38-21-6-36-16-36-38V22Z" fill="#dbeafe" />
      <path
        d="M60 10 96 22v20c0 22-15 32-36 38-21-6-36-16-36-38V22Z"
        fill="none"
        stroke="#2563eb"
        strokeWidth="2"
      />
      <path
        d="M46 42l10 10 20-20"
        fill="none"
        stroke="#1d4ed8"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const capabilities = [
  {
    title: "Multi-Tenant Practice Management",
    description:
      "Onboard medical, legal, physiotherapy, IT, homeopathy, and astrology practices onto their own branded subdomain, each with its own admin, staff, and settings.",
    illustration: TenantIllustration,
  },
  {
    title: "Isolated by Design",
    description:
      "Row-level security and tenant-scoped data mean one practice's client records, cases, and notes are never visible to another — enforced at the database, not just the UI.",
    illustration: IsolationIllustration,
  },
  {
    title: "Session Timeline & AI Recaps",
    description:
      "Consultants record, transcribe, and log every session; a case-scoped AI assistant drafts recaps and surfaces past context, cited back to the source note.",
    illustration: TimelineIllustration,
  },
  {
    title: "Recurring Bookings & Reminders",
    description:
      "Book a six-week treatment plan in one flow, not one slot at a time — with email reminders so clients never miss a session.",
    illustration: SeriesIllustration,
  },
  {
    title: "Trust & Grievance Oversight",
    description:
      "A platform-level reporting channel lets any client raise a concern directly with Ayushman, bypassing the tenant it's about — accountability nobody can quietly switch off.",
    illustration: TrustIllustration,
  },
];

export function CapabilitiesSection() {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {capabilities.map((c, i) => {
        const Illustration = c.illustration;
        return (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
            whileHover={{ y: -4 }}
          >
            <Card className="h-full overflow-hidden border-blue-100 bg-white/70 transition-shadow hover:shadow-lg hover:shadow-blue-100">
              <div className="h-24 w-full bg-linear-to-br from-blue-50 to-white p-4">
                <Illustration />
              </div>
              <CardHeader>
                <CardTitle>{c.title}</CardTitle>
                <CardDescription>{c.description}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
