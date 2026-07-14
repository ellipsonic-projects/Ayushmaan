"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Globe, UploadCloud, Plus, X } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  useMe,
  useTenantSite,
  updateTenantSite,
  uploadTenantLogo,
  requestCustomLayout,
} from "@/lib/hooks";
import { useAuth } from "@/lib/auth/context";
import type { TenantSiteContent, TenantThemeConfig } from "@/lib/hooks";

const EMPTY_CONTENT: TenantSiteContent = {
  navbar: { links: [] },
  hero: { heading: "", subheading: "", ctaLabel: "" },
  about: { heading: "", body: "" },
  services: { heading: "", items: [] },
  faq: { heading: "", items: [] },
  contact: { email: "", phone: "", address: "" },
};

// Editor for an array of same-shaped rows (navbar links, service cards, FAQ
// entries) — one generic component instead of three near-identical blocks.
function ListFieldEditor<T extends Record<string, string>>({
  items,
  onChange,
  fields,
  addLabel,
  emptyItem,
  disabled,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  fields: { key: keyof T; label: string; multiline?: boolean }[];
  addLabel: string;
  emptyItem: T;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-3">
          <div className="flex flex-1 flex-col gap-2">
            {fields.map((field) => (
              <div key={String(field.key)} className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                {field.multiline ? (
                  <textarea
                    rows={2}
                    value={item[field.key]}
                    onChange={(e) => {
                      const next = items.slice();
                      next[i] = { ...next[i], [field.key]: e.target.value };
                      onChange(next);
                    }}
                    className="w-full resize-none rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    disabled={disabled}
                  />
                ) : (
                  <Input
                    value={item[field.key]}
                    onChange={(e) => {
                      const next = items.slice();
                      next[i] = { ...next[i], [field.key]: e.target.value };
                      onChange(next);
                    }}
                    className="h-8 text-sm"
                    disabled={disabled}
                  />
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            aria-label="Remove"
            disabled={disabled}
            className="mt-1 shrink-0 text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        disabled={disabled}
        onClick={() => onChange([...items, emptyItem])}
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

// Tenant Admin's own public-website editor — hero/about/contact copy and
// brand color, persisted via PATCH /api/tenants/:tenantId/site. Kept as a
// self-contained save unit, separate from the rest of SettingsForm (which is
// still mock data), so this is the one card on the page actually wired up.
export function WebsiteContentForm() {
  const { token } = useAuth();
  const { me } = useMe();
  const tenantId = me?.tenantId ?? null;
  const { site, isLoading, mutate } = useTenantSite(tenantId);

  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [content, setContent] = useState<TenantSiteContent>(EMPTY_CONTENT);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [requestingLayout, setRequestingLayout] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!site) return;
    setLogoUrl(site.logoUrl ?? "");
    setPrimaryColor(site.themeConfig.primaryColor ?? "");
    setContent(site.siteContent ?? EMPTY_CONTENT);
    setDirty(false);
  }, [site]);

  async function handleLogoUpload(file: File) {
    if (!tenantId || !token) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const { data } = await uploadTenantLogo(tenantId, file, token);
      setLogoUrl(data.logoUrl ?? "");
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleRequestLayout(requested: boolean) {
    if (!tenantId || !token) return;
    setRequestingLayout(true);
    setError(null);
    try {
      await requestCustomLayout(tenantId, requested, token);
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update custom layout request");
    } finally {
      setRequestingLayout(false);
    }
  }

  function withDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setDirty(true);
    };
  }

  function updateContent(patch: Partial<TenantSiteContent>) {
    withDirty(setContent)({ ...content, ...patch });
  }

  async function handleSave() {
    if (!tenantId || !token) return;
    setSaving(true);
    setError(null);
    try {
      const themeConfig: TenantThemeConfig = primaryColor ? { primaryColor } : {};
      await updateTenantSite(
        tenantId,
        { logoUrl: logoUrl || undefined, themeConfig, siteContent: content },
        token
      );
      await mutate();
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save website content");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card id="website" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Globe className="h-3.5 w-3.5" />
          Website
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Custom Layout
          </p>
          {site?.layoutMode === "custom" ? (
            <p className="text-sm text-foreground">
              Your public page is currently using a custom layout built by our team. The content
              fields below are saved but won&apos;t appear on your site until it&apos;s switched
              back to the default layout.
            </p>
          ) : site?.customLayoutRequested ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Custom layout requested — our team will reach out to build it.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={requestingLayout}
                onClick={() => handleRequestLayout(false)}
              >
                Cancel request
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Want a fully custom page design instead of the default sections below? Request one
                and our team will build and upload it for you.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={requestingLayout || !tenantId}
                onClick={() => handleRequestLayout(true)}
              >
                {requestingLayout ? "Requesting..." : "Request custom layout"}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Logo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleLogoUpload(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo || isLoading}
              className="flex h-24 items-center justify-center gap-3 rounded-lg border border-dashed border-input bg-muted/40 px-4 text-center transition-colors hover:bg-muted/60 disabled:opacity-60"
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt=""
                  width={56}
                  height={56}
                  className="rounded-md object-contain"
                />
              ) : (
                <UploadCloud className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-xs font-medium text-foreground">
                {uploadingLogo ? "Uploading..." : logoUrl ? "Replace logo" : "Upload logo"}
              </span>
            </button>
            <p className="text-[11px] text-muted-foreground">PNG, JPEG, SVG, or WebP. Max 2MB.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="primary-color">Brand Color</Label>
            <div className="flex h-9 items-center gap-2">
              <input
                id="primary-color"
                type="color"
                value={primaryColor || "#4f39d6"}
                onChange={(e) => withDirty(setPrimaryColor)(e.target.value)}
                className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-input bg-transparent"
                disabled={isLoading}
              />
              <Input
                value={primaryColor}
                placeholder="#4f39d6"
                onChange={(e) => withDirty(setPrimaryColor)(e.target.value)}
                className="h-9"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Navbar Links
          </p>
          <ListFieldEditor
            items={content.navbar.links}
            onChange={(links) => updateContent({ navbar: { links } })}
            fields={[
              { key: "label", label: "Label" },
              { key: "href", label: "Link (e.g. #services or /about)" },
            ]}
            addLabel="Add link"
            emptyItem={{ label: "", href: "" }}
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Hero Section
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hero-heading">Heading</Label>
            <Input
              id="hero-heading"
              value={content.hero.heading}
              onChange={(e) =>
                updateContent({ hero: { ...content.hero, heading: e.target.value } })
              }
              className="h-9"
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hero-subheading">Subheading</Label>
            <Input
              id="hero-subheading"
              value={content.hero.subheading}
              onChange={(e) =>
                updateContent({ hero: { ...content.hero, subheading: e.target.value } })
              }
              className="h-9"
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label htmlFor="hero-cta">Call-to-action Label</Label>
            <Input
              id="hero-cta"
              value={content.hero.ctaLabel}
              onChange={(e) =>
                updateContent({ hero: { ...content.hero, ctaLabel: e.target.value } })
              }
              className="h-9"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            About Section
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="about-heading">Heading</Label>
            <Input
              id="about-heading"
              value={content.about.heading}
              onChange={(e) =>
                updateContent({ about: { ...content.about, heading: e.target.value } })
              }
              className="h-9"
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="about-body">Body</Label>
            <textarea
              id="about-body"
              rows={4}
              value={content.about.body}
              onChange={(e) => updateContent({ about: { ...content.about, body: e.target.value } })}
              placeholder="Tell visitors about your practice. Left blank, a placeholder is shown instead."
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Services
          </p>
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label htmlFor="services-heading">Section Heading</Label>
            <Input
              id="services-heading"
              value={content.services.heading}
              onChange={(e) =>
                updateContent({ services: { ...content.services, heading: e.target.value } })
              }
              className="h-9"
              disabled={isLoading}
            />
          </div>
          <ListFieldEditor
            items={content.services.items}
            onChange={(items) => updateContent({ services: { ...content.services, items } })}
            fields={[
              { key: "title", label: "Title" },
              { key: "description", label: "Description", multiline: true },
            ]}
            addLabel="Add service"
            emptyItem={{ title: "", description: "" }}
            disabled={isLoading}
          />
          <p className="text-[11px] text-muted-foreground">
            Hidden on the public page until at least one service is added.
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">FAQ</p>
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label htmlFor="faq-heading">Section Heading</Label>
            <Input
              id="faq-heading"
              value={content.faq.heading}
              onChange={(e) => updateContent({ faq: { ...content.faq, heading: e.target.value } })}
              className="h-9"
              disabled={isLoading}
            />
          </div>
          <ListFieldEditor
            items={content.faq.items}
            onChange={(items) => updateContent({ faq: { ...content.faq, items } })}
            fields={[
              { key: "question", label: "Question" },
              { key: "answer", label: "Answer", multiline: true },
            ]}
            addLabel="Add question"
            emptyItem={{ question: "", answer: "" }}
            disabled={isLoading}
          />
          <p className="text-[11px] text-muted-foreground">
            Hidden on the public page until at least one question is added.
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contact Info
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-email">Public Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={content.contact.email}
                onChange={(e) =>
                  updateContent({ contact: { ...content.contact, email: e.target.value } })
                }
                className="h-9"
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-phone">Public Phone</Label>
              <Input
                id="contact-phone"
                value={content.contact.phone}
                onChange={(e) =>
                  updateContent({ contact: { ...content.contact, phone: e.target.value } })
                }
                className="h-9"
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="contact-address">Address</Label>
              <Input
                id="contact-address"
                value={content.contact.address}
                onChange={(e) =>
                  updateContent({ contact: { ...content.contact, address: e.target.value } })
                }
                className="h-9"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">
            {dirty ? "You have unsaved changes." : "All changes are saved."}
          </span>
          <Button
            type="button"
            size="sm"
            disabled={!dirty || saving || !tenantId}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save Website"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
