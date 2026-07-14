import { SignInForm } from "@/components/auth/signin-form";

export default async function TenantSignInPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SignInForm tenantSlug={slug} />;
}
