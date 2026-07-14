"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenant = getTenant;
const rls_context_1 = require("@ayushman/db/rls-context");
// Resolving which tenant a hostname/slug belongs to happens before any
// app.tenant_id can be set for the request — supabase/policies/02-tenants.sql's
// `tenant_read_own` policy only allows reading a `tenants` row once app.tenant_id
// already matches it, or the caller is a super admin. This lookup deliberately
// goes through that same super-admin RLS bypass (the pattern already used by
// apps/api/tests/integration/rls-policies.test.ts), since it's a system-level
// lookup made before the caller's own tenant is known, not attributable to any
// authenticated user yet.
const SYSTEM_LOOKUP_USER_ID = "00000000-0000-0000-0000-000000000000";
async function getTenant(slug) {
    return (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: SYSTEM_LOOKUP_USER_ID }, (tx) => tx.tenant.findUnique({ where: { slug } }));
}
//# sourceMappingURL=getTenant.js.map