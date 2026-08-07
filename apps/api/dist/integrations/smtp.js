"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Falls back to a logged no-op when unconfigured — keeps dispatch() and the
// crons that call it working without real credentials.
let client;
function getClient() {
    if (client !== undefined)
        return client;
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    client =
        host && port
            ? nodemailer_1.default.createTransport({
                host,
                port: Number(port),
                secure: Number(port) === 465,
                auth: user && pass ? { user, pass } : undefined,
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 10000,
            })
            : null;
    return client;
}
async function sendEmail(to, subject, html) {
    const c = getClient();
    const from = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    if (!c || !from) {
        console.warn("[smtp] Email not configured (SMTP_HOST/SMTP_PORT and either SMTP_FROM_EMAIL or SMTP_USER) — skipping send");
        return;
    }
    await c.sendMail({ from, to, subject, html });
}
//# sourceMappingURL=smtp.js.map