"use client";

import { motion, type Variants } from "motion/react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const illustrationContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};

const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: "easeOut" } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

const drawPath: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: { pathLength: 1, opacity: 1, transition: { duration: 0.8, ease: "easeInOut" } },
};

function TenantIllustration() {
  return (
    <motion.svg
      viewBox="0 0 120 80"
      className="h-full w-full"
      variants={illustrationContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      <motion.rect variants={popIn} x="8" y="34" width="26" height="38" rx="4" fill="#d1e2d9" />
      <motion.rect variants={popIn} x="47" y="20" width="26" height="52" rx="4" fill="#2f5741" />
      <motion.rect variants={popIn} x="86" y="40" width="26" height="32" rx="4" fill="#a9c4b3" />
      <motion.circle variants={popIn} cx="60" cy="10" r="6" fill="#1f3b2c" />
      <motion.circle variants={popIn} cx="21" cy="24" r="4" fill="#a9c4b3" />
      <motion.circle variants={popIn} cx="99" cy="30" r="4" fill="#a9c4b3" />
    </motion.svg>
  );
}

function IsolationIllustration() {
  return (
    <motion.svg
      viewBox="0 0 120 80"
      className="h-full w-full"
      variants={illustrationContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      <motion.rect variants={fadeIn} x="10" y="14" width="44" height="52" rx="10" fill="#d1e2d9" />
      <motion.rect variants={fadeIn} x="66" y="14" width="44" height="52" rx="10" fill="#eef2ee" />
      <motion.path
        variants={drawPath}
        d="M60 14v52"
        stroke="#a9c4b3"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <motion.rect variants={popIn} x="24" y="32" width="16" height="16" rx="4" fill="#2f5741" />
      <motion.rect variants={popIn} x="80" y="32" width="16" height="16" rx="4" fill="#5c8a6e" />
    </motion.svg>
  );
}

function TimelineIllustration() {
  return (
    <motion.svg
      viewBox="0 0 120 80"
      className="h-full w-full"
      variants={illustrationContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      <motion.path
        variants={drawPath}
        d="M14 60 34 40 54 52 76 26 106 20"
        fill="none"
        stroke="#2f5741"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <motion.circle variants={popIn} cx="14" cy="60" r="4" fill="#1f3b2c" />
      <motion.circle variants={popIn} cx="34" cy="40" r="4" fill="#1f3b2c" />
      <motion.circle variants={popIn} cx="54" cy="52" r="4" fill="#1f3b2c" />
      <motion.circle variants={popIn} cx="76" cy="26" r="4" fill="#1f3b2c" />
      <motion.circle
        cx="106"
        cy="20"
        r="5"
        fill="#5c8a6e"
        variants={popIn}
        animate={{
          scale: [1, 1.25, 1],
          transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 1 },
        }}
      />
      <motion.rect variants={fadeIn} x="90" y="34" width="26" height="14" rx="4" fill="#d1e2d9" />
    </motion.svg>
  );
}

function SeriesIllustration() {
  return (
    <motion.svg
      viewBox="0 0 120 80"
      className="h-full w-full"
      variants={illustrationContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {Array.from({ length: 6 }).map((_, i) => {
        const height = i < 2 ? 46 : 32;
        const y = i < 2 ? 20 : 34;
        return (
          <motion.rect
            key={i}
            x={10 + i * 17}
            width="12"
            rx="3"
            fill={i < 2 ? "#2f5741" : "#d1e2d9"}
            variants={
              {
                hidden: { height: 0, y: y + height },
                show: {
                  height,
                  y,
                  transition: { duration: 0.45, ease: "easeOut" },
                },
              } satisfies Variants
            }
          />
        );
      })}
    </motion.svg>
  );
}

function TrustIllustration() {
  return (
    <motion.svg
      viewBox="0 0 120 80"
      className="h-full w-full"
      variants={illustrationContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      <motion.path
        variants={fadeIn}
        d="M60 10 96 22v20c0 22-15 32-36 38-21-6-36-16-36-38V22Z"
        fill="#d1e2d9"
      />
      <motion.path
        variants={drawPath}
        d="M60 10 96 22v20c0 22-15 32-36 38-21-6-36-16-36-38V22Z"
        fill="none"
        stroke="#2f5741"
        strokeWidth="2"
      />
      <motion.path
        variants={drawPath}
        d="M46 42l10 10 20-20"
        fill="none"
        stroke="#1f3b2c"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
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
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
            whileHover={{ y: -4 }}
          >
            <Card className="h-full overflow-hidden border-stone-200 bg-white/70 transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900/70">
              <div className="h-24 w-full bg-linear-to-br from-emerald-50 to-white p-4 dark:from-emerald-950/20 dark:to-stone-900">
                <Illustration />
              </div>
              <CardHeader>
                <CardTitle className="font-display font-normal">{c.title}</CardTitle>
                <CardDescription>{c.description}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
