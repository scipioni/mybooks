import nodemailer, { type SentMessageInfo } from "nodemailer";
import { env, requireEnv } from "@/lib/env";

function createTransport() {
  requireEnv(["SMTP_HOST", "SMTP_FROM"]);

  const port = Number(env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
}

export async function sendInviteEmail(opts: { toEmail: string }): Promise<SentMessageInfo> {
  const transporter = createTransport();
  const signInUrl = env.NEXTAUTH_URL ? `${env.NEXTAUTH_URL}/signin` : "/signin";

  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to: opts.toEmail,
    subject: "You've been invited to mybooks",
    text: `You've been invited to join mybooks.\n\nSign in with Google using this email address (${opts.toEmail}) to get started:\n${signInUrl}`,
  });

  return info;
}

export async function sendBookToDevice(opts: {
  toEmail: string;
  bookTitle: string;
  filePath: string;
}): Promise<SentMessageInfo> {
  const transporter = createTransport();

  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to: opts.toEmail,
    subject: opts.bookTitle,
    text: `Your e-reader library has sent you "${opts.bookTitle}".`,
    attachments: [
      {
        filename: `${sanitizeFilename(opts.bookTitle)}.epub`,
        path: opts.filePath,
      },
    ],
  });

  return info;
}

function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned.slice(0, 120) || "book";
}
