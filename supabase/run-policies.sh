#!/usr/bin/env bash
# Applies every supabase/roles/*.sql, supabase/auth-hooks/*.sql,
# supabase/policies/*.sql, and supabase/storage-policies/*.sql file against
# the database, in filename order within each directory (the numeric
# prefixes in policies/ encode dependency order — e.g.
# 01-tenant-isolation-child-tables.sql assumes 00-tenant-isolation.sql's
# tables already exist). roles/ runs first since it creates app_user, which
# auth-hooks/ and policies/ grant against. auth-hooks/ runs next since its
# grants (supabase_auth_admin access to public.users) are foundational, not
# tenant-scoped. storage-policies/ runs last since it creates the Storage
# buckets (case-documents, consultant-verification) and their RLS policies,
# which reference public.tenants. Uses the owner connection
# (MIGRATE_DATABASE_URL, falling back to DATABASE_URL) since CREATE POLICY
# needs DDL privileges — same fallback rule as packages/db/prisma.config.ts.
#
# Note: supabase/roles/app-role.sql's `create role app_user` is not
# idempotent — rerunning this script against a database where app_user
# already exists will abort on that statement (ON_ERROR_STOP=1 below).
#
# Usage: supabase/run-policies.sh
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
roles_dir="$repo_root/supabase/roles"
auth_hooks_dir="$repo_root/supabase/auth-hooks"
policies_dir="$repo_root/supabase/policies"
storage_policies_dir="$repo_root/supabase/storage-policies"

set -a
[ -f "$repo_root/apps/api/.env" ] && source "$repo_root/apps/api/.env"
[ -f "$repo_root/apps/api/.env.local" ] && source "$repo_root/apps/api/.env.local"
set +a

db_url="${MIGRATE_DATABASE_URL:-${DATABASE_URL:-}}"
if [ -z "$db_url" ]; then
  echo "error: neither MIGRATE_DATABASE_URL nor DATABASE_URL is set (checked apps/api/.env, apps/api/.env.local)" >&2
  exit 1
fi

shopt -s nullglob
role_files=("$roles_dir"/*.sql)
auth_hook_files=("$auth_hooks_dir"/*.sql)
policy_files=("$policies_dir"/*.sql)
storage_policy_files=("$storage_policies_dir"/*.sql)
if [ ${#role_files[@]} -eq 0 ] && [ ${#auth_hook_files[@]} -eq 0 ] && [ ${#policy_files[@]} -eq 0 ] && [ ${#storage_policy_files[@]} -eq 0 ]; then
  echo "error: no .sql files found in $roles_dir, $auth_hooks_dir, $policies_dir, or $storage_policies_dir" >&2
  exit 1
fi

for file in $(printf '%s\n' "${role_files[@]}" | sort); do
  echo "==> applying $(basename "$file")"
  psql "$db_url" -v ON_ERROR_STOP=1 -f "$file"
done

for file in $(printf '%s\n' "${auth_hook_files[@]}" | sort); do
  echo "==> applying $(basename "$file")"
  psql "$db_url" -v ON_ERROR_STOP=1 -f "$file"
done

for file in $(printf '%s\n' "${policy_files[@]}" | sort); do
  echo "==> applying $(basename "$file")"
  psql "$db_url" -v ON_ERROR_STOP=1 -f "$file"
done

for file in $(printf '%s\n' "${storage_policy_files[@]}" | sort); do
  echo "==> applying $(basename "$file")"
  psql "$db_url" -v ON_ERROR_STOP=1 -f "$file"
done

echo "==> all policies applied"
