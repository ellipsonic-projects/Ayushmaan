-- Public bucket for tenant landing-page assets (logo, banner). Unlike
-- case-documents/consultant-verification (tenant-prefixed, private,
-- accessed only via apps/api-issued signed URLs), this bucket is:
--   - public: objects are rendered on the unauthenticated public landing
--     page, so a plain object URL (not a signed URL) has to work.
--   - keyed by tenant SLUG, not tenantId — "{slug}/{filename}" — since the
--     slug is what's public-facing here, not an internal id.
--
-- apps/api uploads via the service-role key (bypasses RLS), same as the
-- other buckets in this directory — a client never gets a raw bucket
-- credential. These policies are defense-in-depth against a client hitting
-- Storage directly with its own JWT.

insert into storage.buckets (id, name, public)
values ('landing-assets', 'landing-assets', true)
on conflict (id) do nothing;

drop policy if exists landing_assets_public_read on storage.objects;
create policy landing_assets_public_read on storage.objects
  for select
  using (bucket_id = 'landing-assets');

drop policy if exists landing_assets_service_role_write on storage.objects;
create policy landing_assets_service_role_write on storage.objects
  for all
  using (bucket_id = 'landing-assets' and auth.role() = 'service_role')
  with check (bucket_id = 'landing-assets' and auth.role() = 'service_role');
