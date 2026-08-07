import type { ReactNode } from "react";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import Image from "next/image";

// Landing-only typography: condensed, formal, and operational.
// The product console keeps Geist; this wrapper scopes the marketing voice.
const display = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-landing-mono",
});

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${display.variable} ${mono.variable}`}
      style={{ fontFamily: "var(--font-display), sans-serif" }}
    >
      {/* Shared background for every (landing) page — pages with their own
          opaque surface (e.g. signin, billing) will simply draw over it. */}
      <div className="fixed inset-0 -z-10 bg-white dark:bg-black">
        <Image
          src="/landing_page.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-[0.025] grayscale dark:opacity-[0.04]"
        />
      </div>

      {children}
    </div>
  );
}
