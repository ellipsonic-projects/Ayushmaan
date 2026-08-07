-- Supabase Storage buckets + RLS, matching the tenant-prefixed path
-- convention (PRD §1.2/§7 — "cases/{tenantSlug}/{caseId}/..." for case
-- documents and session audio, "{tenantSlug}/{consultantId}/..." for
-- consultant verification documents, schema §3.25). Slug rather than id
-- keeps the object path human-readable, matching the subdomain the file was
-- uploaded through.
--
-- apps/api issues short-lived signed URLs using the service-role key
-- (bypasses RLS entirely, per PRD §3.16/§7.3 — "never a raw bucket
-- credential"), so these policies are defense-in-depth against a client
-- hitting Storage directly with its own JWT rather than the primary access
-- path.

insert into storage.buckets (id, name, public)
values
  ('case-documents', 'case-documents', false),
  ('consultant-verification', 'consultant-verification', false)
on conflict (id) do nothing;

-- case-documents object paths look like
-- "<bucket>/cases/{tenantSlug}/{caseId}/{filename}" — storage.foldername(name)
-- splits the object path into its folder segments, so segment [1] is the
-- literal "cases" prefix and segment [2] is the tenantSlug. app.tenant_id
-- (session context) is the tenant's uuid, so it's resolved to a slug via
-- `tenants` before comparing against the path segment.
--
-- consultant-verification keeps the flatter "<bucket>/{tenantSlug}/{consultantId}/..."
-- layout (segment [1] is the tenantSlug) — no equivalent "cases/" grouping
-- prefix applies to it.

drop policy if exists case_documents_tenant_isolation on storage.objects;
create policy case_documents_tenant_isolation on storage.objects
  for all
  using (
    bucket_id = 'case-documents'
    and (
      (storage.foldername(name))[2] = (
        select slug from public.tenants
         where id = nullif(current_setting('app.tenant_id', true), '')::uuid
      )
      or current_setting('app.is_super_admin', true) = 'true'
    )
  )
  with check (
    bucket_id = 'case-documents'
    and (
      (storage.foldername(name))[2] = (
        select slug from public.tenants
         where id = nullif(current_setting('app.tenant_id', true), '')::uuid
      )
      or current_setting('app.is_super_admin', true) = 'true'
    )
  );

drop policy if exists consultant_verification_tenant_isolation on storage.objects;
create policy consultant_verification_tenant_isolation on storage.objects
  for all
  using (
    bucket_id = 'consultant-verification'
    and (
      (storage.foldername(name))[1] = (
        select slug from public.tenants
         where id = nullif(current_setting('app.tenant_id', true), '')::uuid
      )
      or current_setting('app.is_super_admin', true) = 'true'
    )
  )
  with check (
    bucket_id = 'consultant-verification'
    and (
      (storage.foldername(name))[1] = (
        select slug from public.tenants
         where id = nullif(current_setting('app.tenant_id', true), '')::uuid
      )
      or current_setting('app.is_super_admin', true) = 'true'
    )
  );
