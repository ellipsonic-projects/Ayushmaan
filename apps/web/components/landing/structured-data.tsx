// schema.org JSON-LD — the structured-data format search engines and
// LLM-based crawlers/answer-engines (ChatGPT browsing, Perplexity, Google AI
// Overviews) parse preferentially over scraping visible markup, so this is
// what actually drives "chatbot discoverability" here, not the visible copy.
export function OrganizationJsonLd({
  name,
  description,
  url,
  logoUrl,
  email,
  phone,
  address,
}: {
  name: string;
  description?: string;
  url: string;
  logoUrl?: string | null;
  email?: string;
  phone?: string;
  address?: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name,
    url,
  };
  if (description) schema.description = description;
  if (logoUrl) schema.logo = logoUrl;
  if (email) schema.email = email;
  if (phone) schema.telephone = phone;
  if (address) schema.address = { "@type": "PostalAddress", streetAddress: address };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output can't contain an unescaped "</script>" sequence.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
    />
  );
}
