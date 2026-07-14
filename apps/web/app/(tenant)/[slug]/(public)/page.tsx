import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { AboutSection } from "@/components/landing/about-section";
import { ServicesSection } from "@/components/landing/services-section";
import { FaqSection } from "@/components/landing/faq-section";
import { ContactFooter } from "@/components/landing/contact-footer";
import { OrganizationJsonLd } from "@/components/landing/structured-data";
import { api } from "@/lib/api/client";
import type { PublicTenantSite, TenantSiteContent } from "@/lib/hooks";

const TENANT_ROOT_HOST = process.env.NEXT_PUBLIC_TENANT_ROOT_HOST || "localhost";

// cache() dedupes this across generateMetadata and the page render — both
// run in the same request and would otherwise fetch twice.
const getSite = cache(async (slug: string): Promise<PublicTenantSite | null> => {
  try {
    const res = await api.get<{ data: PublicTenantSite }>(`/api/public/tenants/${slug}/site`);
    return res.data;
  } catch {
    return null;
  }
});

function tenantUrl(slug: string) {
  return `https://${slug}.${TENANT_ROOT_HOST}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return {};

  const title = site.siteContent.hero?.heading || site.displayName;
  const description =
    site.siteContent.hero?.subheading || site.siteContent.about?.body || undefined;
  const url = tenantUrl(slug);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: site.displayName,
      images: site.logoUrl ? [{ url: site.logoUrl }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: site.logoUrl ? [site.logoUrl] : undefined,
    },
  };
}

// Placeholder copy for sections the tenant hasn't filled in yet — keeps the
// section visible (as a "here's where this goes" slot) instead of crashing
// or silently vanishing when siteContent is {} (tenants created before this
// field existed) or only partially filled in.
const DEFAULT_CONTENT: TenantSiteContent = {
  navbar: {
    links: [
      { label: "About", href: "#about" },
      { label: "Services", href: "#services" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  hero: {
    heading: "Hero Section",
    subheading: "Add a subheading to introduce your practice.",
    ctaLabel: "Get Started",
  },
  about: {
    heading: "About Section",
    body: "Add a description of your practice here.",
  },
  services: {
    heading: "Services",
    items: [],
  },
  faq: {
    heading: "Frequently Asked Questions",
    items: [],
  },
  contact: { email: "", phone: "", address: "" },
};

export default async function TenantLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSite(slug);

  if (!site) {
    notFound();
  }

  if (site.layoutMode === "custom" && site.customLayoutUrl) {
    // Fetched fresh per request (not via the cached getSite() call) since the
    // HTML lives in Storage, not the DB row; sanitized server-side at upload
    // time (apps/api/src/routes/tenants.router.ts), so it's safe to inject.
    const html = await fetch(site.customLayoutUrl, { cache: "no-store" })
      .then((res) => (res.ok ? res.text() : null))
      .catch(() => null);
    if (html) {
      return (
        <>
          <OrganizationJsonLd
            name={site.displayName}
            description={site.siteContent.hero?.subheading}
            url={tenantUrl(slug)}
            logoUrl={site.logoUrl}
          />
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </>
      );
    }
  }

  const raw = site.siteContent ?? ({} as Partial<TenantSiteContent>);
  const navbar = { ...DEFAULT_CONTENT.navbar, ...raw.navbar };
  const hero = { ...DEFAULT_CONTENT.hero, ...raw.hero };
  const about = { ...DEFAULT_CONTENT.about, ...raw.about };
  const services = { ...DEFAULT_CONTENT.services, ...raw.services };
  const faq = { ...DEFAULT_CONTENT.faq, ...raw.faq };
  const contact = { ...DEFAULT_CONTENT.contact, ...raw.contact };

  return (
    <div className="flex min-h-screen flex-col">
      <OrganizationJsonLd
        name={site.displayName}
        description={hero.subheading || about.body}
        url={tenantUrl(slug)}
        logoUrl={site.logoUrl}
        email={contact.email || undefined}
        phone={contact.phone || undefined}
        address={contact.address || undefined}
      />
      <Navbar displayName={site.displayName} logoUrl={site.logoUrl} links={navbar.links} />
      <main className="flex flex-1 flex-col">
        <HeroSection
          heading={hero.heading}
          subheading={hero.subheading}
          ctaLabel={hero.ctaLabel}
          logoUrl={site.logoUrl}
        />
        <AboutSection heading={about.heading} body={about.body} />
        {services.items.length > 0 && (
          <ServicesSection heading={services.heading} items={services.items} />
        )}
        {faq.items.length > 0 && <FaqSection heading={faq.heading} items={faq.items} />}
      </main>
      <ContactFooter
        displayName={site.displayName}
        email={contact.email}
        phone={contact.phone}
        address={contact.address}
      />
    </div>
  );
}
