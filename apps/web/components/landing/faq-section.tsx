import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export function FaqSection({
  heading,
  items,
}: {
  heading: string;
  items: { question: string; answer: string }[];
}) {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="border-t border-border bg-muted/30 px-6 py-16"
    >
      <div className="mx-auto max-w-2xl">
        <h2
          id="faq-heading"
          className="text-center text-2xl font-semibold tracking-tight text-foreground"
        >
          {heading}
        </h2>
        <Accordion type="single" collapsible className="mt-6">
          {items.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
