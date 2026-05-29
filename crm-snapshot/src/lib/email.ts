// Resend wrapper. Throws if not configured.

import { Resend } from "resend";
import { env } from "@/lib/env";

export interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(args: SendArgs) {
  const resend = new Resend(env.resendApiKey);
  const { data, error } = await resend.emails.send({
    from: env.resendFromEmail,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    replyTo: args.replyTo,
  });
  if (error) throw new Error(`Email failed: ${error.message}`);
  return data;
}

/** Pretty Hebrew RTL invitation email. */
export function renderInvitationEmail(args: {
  workspaceName: string;
  inviterName: string;
  acceptUrl: string;
  role: "owner" | "admin" | "member";
}) {
  const roleHe = args.role === "admin" ? "מנהל" : "חבר צוות";
  return `
<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>הוזמנת ל-${escapeHtml(args.workspaceName)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8f9fb;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8f9fb;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e3e7ee;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 0 32px;">
                <div style="display:inline-flex;align-items:center;gap:8px;font-size:22px;font-weight:700;color:#0c54a2;">
                  <span style="display:inline-block;height:36px;width:36px;line-height:36px;text-align:center;background:#0c69c8;color:#ffffff;border-radius:10px;">c</span>
                  countme CRM
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 8px 32px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;color:#101828;">הוזמנת ל-${escapeHtml(args.workspaceName)}</h1>
                <p style="margin:0 0 16px 0;color:#475467;line-height:1.6;">
                  ${escapeHtml(args.inviterName)} מזמין אותך להצטרף לצוות ב-countme CRM כ${roleHe}.
                </p>
                <p style="margin:0 0 24px 0;color:#475467;line-height:1.6;">
                  המערכת כוללת צ'אט פנימי, ניהול אנשי קשר, משימות עם גאנט, מסמכים ויומן משותף.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 32px 32px 32px;">
                <a href="${args.acceptUrl}" style="display:inline-block;background:#0c69c8;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;">
                  קבל הזמנה
                </a>
                <div style="margin-top:14px;font-size:12px;color:#98a2b3;">
                  או הדבק את הקישור הבא בדפדפן:<br />
                  <span style="word-break:break-all;">${escapeHtml(args.acceptUrl)}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px 32px;border-top:1px solid #e3e7ee;color:#98a2b3;font-size:12px;">
                ההזמנה תקפה ל-14 יום. אם לא ציפית להזמנה זו, ניתן להתעלם מהמייל.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
