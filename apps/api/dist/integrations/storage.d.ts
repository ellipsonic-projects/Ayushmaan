export declare function createSessionAudioUploadUrl(tenantSlug: string, caseId: string, fileName: string): Promise<{
    path: string;
    signedUrl: string;
    token: string;
}>;
export declare function createCaseDocumentUploadUrl(tenantSlug: string, caseId: string, fileName: string): Promise<{
    path: string;
    signedUrl: string;
    token: string;
}>;
export declare function createCaseDocumentDownloadUrl(storagePath: string): Promise<string>;
//# sourceMappingURL=storage.d.ts.map