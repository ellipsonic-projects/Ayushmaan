-- schema_ayushman_v3.md §4.2: a Tenant Admin's access to private clinical/
-- legal notes is "logged escalation only," not a standing grant.
-- interactions.notes where is_client_visible = FALSE has no RLS branch for
-- TENANT_ADMIN — apps/api must route any such access through this
-- SECURITY DEFINER function instead of a plain SELECT, so escalated access
-- is always logged and never accidentally granted by a future policy edit.

create or replace function public.tenant_admin_view_case(p_case_id uuid, p_reason text)
returns setof public.cases
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason is required for escalated case access';
  end if;

  insert into public.audit_logs (
    tenant_id, actor_user_id, actor_role, is_cross_tenant_access,
    action, entity_type, entity_id, reason
  )
  values (
    current_setting('app.tenant_id', true)::uuid,
    current_setting('app.user_id', true)::uuid,
    'TENANT_ADMIN',
    false,
    'VIEW_CASE_ESCALATED',
    'cases',
    p_case_id,
    p_reason
  );

  return query
    select * from public.cases
     where id = p_case_id
       and tenant_id = current_setting('app.tenant_id', true)::uuid;
end;
$$;

revoke execute on function public.tenant_admin_view_case(uuid, text) from public, anon;
grant execute on function public.tenant_admin_view_case(uuid, text) to authenticated;

-- app_user calls this for the SECURITY DEFINER escalation path (schema
-- §4.2); granted here rather than in supabase/roles/app-role.sql since
-- roles/ runs before policies/ (see run-policies.sh) and this function
-- doesn't exist yet at that point.
grant execute on function public.tenant_admin_view_case(uuid, text) to app_user;
