import { z } from "zod";

/**
 * Environment variables are loaded permissively at module load time (so that
 * `next build` and pages that merely import server modules never crash for
 * missing optional configuration), and validated strictly on-demand via
 * `requireEnv` right before a feature that needs them actually runs (Google
 * sign-in, SMTP sending, admin bootstrap).
 */
const schema = z.object({
  ADMIN_EMAIL: z.string().default(""),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  NEXTAUTH_SECRET: z.string().default(""),
  NEXTAUTH_URL: z.string().default(""),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.string().default("587"),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  SMTP_FROM: z.string().default(""),
  GOOGLE_BOOKS_API_KEY: z.string().default(""),
  BOOKS_STORAGE_PATH: z.string().default("./data/books"),
  DATABASE_PATH: z.string().default("./data/mybooks.db"),
});

export type Env = z.infer<typeof schema>;

export const env: Env = schema.parse(process.env);

/**
 * Throws a clear error if any of the listed environment variables are unset,
 * so misconfiguration fails loudly at the point of use rather than silently
 * degrading (e.g. NextAuth silently rejecting every sign-in, or nodemailer
 * connecting to an empty host).
 */
export function requireEnv(keys: (keyof Env)[]): void {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. See .env.example.`
    );
  }
}
