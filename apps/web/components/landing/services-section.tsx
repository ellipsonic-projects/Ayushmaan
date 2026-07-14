import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function ServicesSection({
  heading,
  items,
}: {
  heading: string;
  items: { title: string; description: string }[];
}) {
  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="border-t border-border px-6 py-16"
    >
      <div className="mx-auto max-w-5xl">
        <h2
          id="services-heading"
          className="text-center text-2xl font-semibold tracking-tight text-foreground"
        >
          {heading}
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
