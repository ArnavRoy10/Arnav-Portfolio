import nodemailer from "nodemailer";

/** Email notifications are optional: they turn on when SMTP_* and NOTIFY_EMAIL are set in .env. */
export function mailConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.NOTIFY_EMAIL,
  );
}

const clean = (s: string) => s.replace(/[\r\n"<>]/g, " ").trim().slice(0, 100);

export async function notifyNewMessage(m: { name: string; email: string; message: string }) {
  if (!mailConfigured()) return;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const name = clean(m.name);
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: process.env.NOTIFY_EMAIL,
    // Hit "Reply" in your email app and it goes straight to the visitor.
    replyTo: { name, address: m.email },
    subject: `New portfolio message from ${name}`,
    text: `From: ${name} <${m.email}>\n\n${m.message}\n\n(Also saved in your admin under Messages.)`,
  });
}
