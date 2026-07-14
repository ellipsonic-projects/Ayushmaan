import Link from "next/link";

import { Button } from "@/components/ui/button";

export default async function TenantLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 py-12 text-center">
      <div>
        <p className="text-xs font-medium tracking-widest text-muted-foreground">AYUSHMAN</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{slug}</h1>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signin">Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/register">Create an account</Link>
        </Button>
      </div>
    </div>
  );
}
