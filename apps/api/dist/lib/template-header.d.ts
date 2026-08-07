export interface TemplateHeaderInfo {
    organizationName: string;
    consultantName: string;
    contactNumber: string;
    tenantAddress: string;
    adminEmail: string;
    adminPhone: string;
}
export declare function renderTemplateHeaderHtml(header: TemplateHeaderInfo): string;
export declare function renderTemplateHeaderText(header: TemplateHeaderInfo): string;
export declare function buildTemplateHeader(context: Record<string, unknown>): TemplateHeaderInfo;
//# sourceMappingURL=template-header.d.ts.map