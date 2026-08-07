// Shared HTML shell for every outbound SMTP email (sendEmail in
// integrations/smtp.ts). Keeps notification/form-submission/workflow emails
// visually consistent without a templating engine — table-based layout for
// email client compatibility. Dark-blue (#0f2044) brand palette with white
// bold body text.

const BRAND_BG = "#0f2044";
const BRAND_TEXT = "#ffffff";
const ACCENT = "#7ba7ff"; // link colour legible on dark backgrounds

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const URL_PATTERN = /(https?:\/\/[^\s<]+)/g;

// Escapes plain text and turns it into HTML paragraphs/links, for the
// call sites (notification.service.ts, form-submission.service.ts) that
// only ever built a bare text string before.
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const escaped = escapeHtml(paragraph).replace(/\n/g, "<br>");
      const linked = escaped.replace(
        URL_PATTERN,
        (url) => `<a href="${url}" style="color:${ACCENT};">${url}</a>`
      );
      return `<p style="margin:0 0 16px;">${linked}</p>`;
    })
    .join("");
}

// Wraps a pre-built HTML fragment (already-escaped/rendered content) in the
// shared email shell: dark-blue card with white bold text and the Ayushmaan
// brand header at the top.
export function wrapEmailHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:24px;background-color:#07122b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:${BRAND_BG};border-radius:8px;overflow:hidden;">
      <!-- Brand header -->
      <tr>
        <td style="padding:24px 32px 20px;background-color:${BRAND_BG};border-bottom:1px solid #1e3a6e;">
          <h1 style="margin:0;font-size:26px;font-weight:700;color:${BRAND_TEXT};letter-spacing:-0.5px;">Ayushmaan.</h1>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding:32px;font-size:15px;line-height:1.6;color:${BRAND_TEXT};font-weight:700;">
          ${bodyHtml}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
