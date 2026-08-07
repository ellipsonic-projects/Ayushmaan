"use client";

const PAD = 6;

export function TourOverlay({ rect }: { rect: DOMRect | null }) {
  if (!rect) {
    // pointer-events-none: this is a dimming visual only — the user still
    // needs to click through to the real page to navigate to the next step.
    return <div className="pointer-events-none fixed inset-0 z-[100] bg-black/55" />;
  }

  const top = Math.max(rect.top - PAD, 0);
  const left = Math.max(rect.left - PAD, 0);
  const right = rect.right + PAD;
  const bottom = rect.bottom + PAD;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <div className="absolute inset-x-0 top-0 bg-black/55" style={{ height: top }} />
      <div className="absolute inset-x-0 bottom-0 bg-black/55" style={{ top: bottom }} />
      <div
        className="absolute bg-black/55"
        style={{ top, height: bottom - top, left: 0, width: left }}
      />
      <div
        className="absolute bg-black/55"
        style={{ top, height: bottom - top, left: right, right: 0 }}
      />
      <div
        className="pointer-events-none absolute rounded-lg ring-2 ring-white/90 ring-offset-2 ring-offset-black/10"
        style={{ top, left, width: right - left, height: bottom - top }}
      />
    </div>
  );
}
