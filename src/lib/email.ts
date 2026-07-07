import 'server-only';
import nodemailer from 'nodemailer';

// Transactional email helper — gated on SMTP_* env vars, like Stripe/Upstash.
// Inert (returns { skipped }) until configured, so the app runs fine without it.
// Reuse the same Gmail SMTP the Supabase auth emails use:
//   SMTP_HOST=smtp.gmail.com  SMTP_PORT=465
//   SMTP_USER=info.craftology.shop@gmail.com  SMTP_PASS=<gmail app password>
//   SMTP_FROM="Craft'zaar <info.craftology.shop@gmail.com>"  (optional)
//   ADMIN_NOTIFY_EMAIL=info.craftology.shop@gmail.com  (where admin alerts go)
const HOST = process.env.SMTP_HOST;
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
const PORT = Number(process.env.SMTP_PORT ?? '465');
const FROM = process.env.SMTP_FROM ?? (USER ? `Craft'zaar <${USER}>` : undefined);

export const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL ?? 'info.craftology.shop@gmail.com';

export function isEmailConfigured(): boolean {
  return !!(HOST && USER && PASS);
}

let transporter: nodemailer.Transporter | null = null;
function getTransport() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: PORT === 465, // implicit TLS on 465, STARTTLS on 587
      auth: { user: USER, pass: PASS },
    });
  }
  return transporter;
}

/** Escapes user-supplied strings before embedding them in notification HTML. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}) {
  if (!isEmailConfigured()) return { skipped: true as const };
  try {
    await getTransport().sendMail({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo,
    });
    return { sent: true as const };
  } catch (e) {
    console.error('sendEmail failed:', e);
    return { error: (e as Error).message };
  }
}
