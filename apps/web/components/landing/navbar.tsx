import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function Navbar({
  displayName,
  logoUrl,
  links,
}: {
  displayName: string;
  logoUrl?: string | null;
  links: { label: string; href: string }[];
}) {
  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
      <Link href="#" className="flex items-center gap-2 font-semibold text-foreground">
        {logoUrl && (
          <Image
            src={logoUrl}
            alt={`${displayName} logo`}
            width={28}
            height={28}
            className="rounded-md object-contain"
          />
        )}
        <span className="truncate">{displayName}</span>
      </Link>
      <div className="flex items-center gap-6">
        <div className="hidden items-center gap-6 sm:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/signin">Sign in</Link>
        </Button>
      </div>
    </nav>
  );
}
