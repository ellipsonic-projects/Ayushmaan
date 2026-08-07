"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSessionAudioUploadUrl = createSessionAudioUploadUrl;
exports.createCaseDocumentUploadUrl = createCaseDocumentUploadUrl;
exports.createCaseDocumentDownloadUrl = createCaseDocumentDownloadUrl;
const supabaseAdmin_1 = require("../lib/supabaseAdmin");
// Session audio shares the `case-documents` bucket, under the same
// cases/{tenantSlug}/{caseId}/... prefix as case documents (supabase/storage-
// policies/tenant-case-prefix.sql) — it's the same object-path convention,
// just an `audio/` subfolder so recordings don't collide with document
// uploads for the same case.
const CASE_DOCUMENTS_BUCKET = "case-documents";
async function createSessionAudioUploadUrl(tenantSlug, caseId, fileName) {
    const path = `cases/${tenantSlug}/${caseId}/audio/${Date.now()}-${fileName}`;
    const { data, error } = await supabaseAdmin_1.supabaseAdmin.storage
        .from(CASE_DOCUMENTS_BUCKET)
        .createSignedUploadUrl(path);
    if (error || !data) {
        throw new Error(`Failed to create signed upload URL: ${error?.message ?? "unknown error"}`);
    }
    return { path, signedUrl: data.signedUrl, token: data.token };
}
// Case document uploads (Sprint 4.3) share the same bucket/prefix
// convention, under a `documents/` subfolder alongside `audio/`.
async function createCaseDocumentUploadUrl(tenantSlug, caseId, fileName) {
    const path = `cases/${tenantSlug}/${caseId}/documents/${Date.now()}-${fileName}`;
    const { data, error } = await supabaseAdmin_1.supabaseAdmin.storage
        .from(CASE_DOCUMENTS_BUCKET)
        .createSignedUploadUrl(path);
    if (error || !data) {
        throw new Error(`Failed to create signed upload URL: ${error?.message ?? "unknown error"}`);
    }
    return { path, signedUrl: data.signedUrl, token: data.token };
}
// Short-lived (5 min) signed download URL — never a raw bucket credential
// or a permanent public link, per docs/api-patterns.md §1.7/§15.
async function createCaseDocumentDownloadUrl(storagePath) {
    const { data, error } = await supabaseAdmin_1.supabaseAdmin.storage
        .from(CASE_DOCUMENTS_BUCKET)
        .createSignedUrl(storagePath, 5 * 60);
    if (error || !data) {
        throw new Error(`Failed to create signed download URL: ${error?.message ?? "unknown error"}`);
    }
    return data.signedUrl;
}
//# sourceMappingURL=storage.js.map