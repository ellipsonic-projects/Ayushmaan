import type { ReactNode } from "react";
import { Newsreader } from "next/font/google";
import Image from "next/image";

// Editorial serif for the marketing site only — calm, expert, timeless
// rather than a "SaaS" display font. The product console keeps Geist.
// Exposed as a CSS variable so page-level markup can opt in via the
// `.font-display` utility (see globals.css) without affecting body text.
const display = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={display.variable}>
      {/* Shared background for every (landing) page — pages with their own
          opaque surface (e.g. signin, billing) will simply draw over it. */}
      <div className="fixed inset-0 -z-10 bg-stone-50 dark:bg-stone-950">
        <Image
          src="/landing_page.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-[0.06] dark:opacity-[0.05]"
        />
      </div>

      {children}
    </div>
  );
}
