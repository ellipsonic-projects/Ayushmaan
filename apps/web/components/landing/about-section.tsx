export function AboutSection({ heading, body }: { heading: string; body: string }) {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="border-t border-border bg-muted/30 px-6 py-16"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="about-heading" className="text-2xl font-semibold tracking-tight text-foreground">
          {heading}
        </h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </section>
  );
}
