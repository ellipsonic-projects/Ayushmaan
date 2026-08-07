"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useGlobalSearch } from "@/lib/api/search.client";

// Debounce delay for the search-as-you-type request — short enough to feel
// live, long enough to avoid a request per keystroke.
const DEBOUNCE_MS = 300;

interface HeaderSearchProps {
  placeholder: string;
  // Base route this console is mounted under, e.g. `/${slug}/tenant/admin`
  // — used to build links into consultant/client detail pages.
  basePath: string | null;
  // Only the consultant console has a working per-case detail page today;
  // the admin console has no case-detail route yet, so interaction/
  // commitment/task results there are shown but not linked.
  canLinkToCases: boolean;
}

export function HeaderSearch({ placeholder, basePath, canLinkToCases }: HeaderSearchProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { results, isLoading, isActive } = useGlobalSearch(debounced);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults =
    !!results &&
    (results.consultants.length > 0 ||
      results.clients.length > 0 ||
      results.interactions.length > 0 ||
      results.commitments.length > 0 ||
      results.tasks.length > 0);

  function closeAndReset() {
    setOpen(false);
    setQuery("");
    setDebounced("");
  }

  return (
    <div ref={containerRef} className="relative hidden w-40 sm:block md:w-56 lg:w-72">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-primary" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder={placeholder}
        className="h-10 rounded-xl border-border bg-background pl-9 shadow-none focus-visible:border-primary/40"
      />
      {open && isActive && (
        <div className="absolute top-full right-0 z-50 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lg">
          {isLoading && !hasResults && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}
          {!isLoading && !hasResults && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;{debounced}&rdquo;
            </p>
          )}
          {results && basePath && (
            <div className="flex flex-col gap-3">
              <ResultGroup label="Consultants" count={results.consultants.length}>
                {results.consultants.map((c) => (
                  <ResultLink
                    key={c.id}
                    href={`${basePath}/consultants/${c.id}`}
                    onClick={closeAndReset}
                  >
                    <span className="font-medium text-foreground">{c.fullName}</span>
                    <span className="text-xs text-muted-foreground">{c.category}</span>
                  </ResultLink>
                ))}
              </ResultGroup>
              <ResultGroup label="Clients" count={results.clients.length}>
                {results.clients.map((c) => (
                  <ResultLink key={c.id} href={`${basePath}/clients`} onClick={closeAndReset}>
                    <span className="font-medium text-foreground">{c.fullName}</span>
                  </ResultLink>
                ))}
              </ResultGroup>
              <ResultGroup label="Interactions" count={results.interactions.length}>
                {results.interactions.map((i) => (
                  <ResultRow
                    key={i.id}
                    href={canLinkToCases ? `${basePath}/cases/${i.caseId}` : null}
                    onClick={closeAndReset}
                  >
                    <span className="truncate font-medium text-foreground">
                      {i.notes || i.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{i.case.client.fullName}</span>
                  </ResultRow>
                ))}
              </ResultGroup>
              <ResultGroup label="Commitments" count={results.commitments.length}>
                {results.commitments.map((c) => (
                  <ResultRow
                    key={c.id}
                    href={canLinkToCases ? `${basePath}/cases/${c.caseId}` : null}
                    onClick={closeAndReset}
                  >
                    <span className="truncate font-medium text-foreground">{c.title}</span>
                    <span className="text-xs text-muted-foreground">{c.status}</span>
                  </ResultRow>
                ))}
              </ResultGroup>
              <ResultGroup label="Tasks" count={results.tasks.length}>
                {results.tasks.map((t) => (
                  <ResultRow
                    key={t.id}
                    href={canLinkToCases ? `${basePath}/cases/${t.caseId}` : null}
                    onClick={closeAndReset}
                  >
                    <span className="truncate font-medium text-foreground">{t.title}</span>
                    <span className="text-xs text-muted-foreground">{t.status}</span>
                  </ResultRow>
                ))}
              </ResultGroup>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div>
      <p className="px-2 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function ResultLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex flex-col rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
    >
      {children}
    </Link>
  );
}

// Same row as ResultLink, but falls back to a non-interactive row when no
// detail page exists yet for this console (see canLinkToCases above).
function ResultRow({
  href,
  onClick,
  children,
}: {
  href: string | null;
  onClick: () => void;
  children: ReactNode;
}) {
  if (!href) {
    return <div className="flex flex-col rounded-lg px-2 py-1.5 text-sm">{children}</div>;
  }
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex flex-col rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
    >
      {children}
    </Link>
  );
}
