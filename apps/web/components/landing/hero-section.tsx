import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function HeroSection({
  heading,
  subheading,
  ctaLabel,
  logoUrl,
}: {
  heading: string;
  subheading: string;
  ctaLabel: string;
  logoUrl?: string | null;
}) {
  return (
    <header className="flex min-h-[70vh] flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center">
      {logoUrl && (
        <Image
          src={logoUrl}
          alt={`${heading} logo`}
          width={72}
          height={72}
          className="rounded-xl object-contain"
        />
      )}
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {heading}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">{subheading}</p>
      </div>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/register">{ctaLabel}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/signin">Sign in</Link>
        </Button>
      </div>
    </header>
  );
}
