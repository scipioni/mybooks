import nodemailer, { type SentMessageInfo } from "nodemailer";
import { env, requireEnv } from "@/lib/env";

export async function sendBookToDevice(opts: {
  toEmail: string;
  bookTitle: string;
  filePath: string;
}): Promise<SentMessageInfo> {
  requireEnv(["SMTP_HOST", "SMTP_FROM"]);

  const port = Number(env.SMTP_PORT) || 587;
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });

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
