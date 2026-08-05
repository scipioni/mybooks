import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { invites, users } from "@/lib/db/schema";
import { handleAuthError, requireAdmin } from "@/lib/authz";
import { sendInviteEmail } from "@/lib/mailer";

export async function GET() {
  try {
    await requireAdmin();
    const pending = db
      .select()
      .from(invites)
      .where(isNull(invites.redeemedAt))
      .orderBy(desc(invites.createdAt))
      .all();
    return NextResponse.json({ invites: pending });
  } catch (err) {
    return handleAuthError(err);
  }
}

const createInviteSchema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => null);
    const parsed = createInviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();

    const existingUser = db.select().from(users).where(eq(users.email, email)).get();
    if (existingUser) {
      return NextResponse.json({ error: "This person is already registered" }, { status: 400 });
    }

    const existingInvite = db
      .select()
      .from(invites)
      .where(and(eq(invites.email, email), isNull(invites.redeemedAt)))
      .get();
    if (existingInvite) {
      return NextResponse.json({ error: "An invite is already pending for this email" }, { status: 400 });
    }

    const invite = {
      id: randomUUID(),
      email,
      invitedBy: admin.id,
      redeemedAt: null,
      createdAt: new Date(),
    };
    db.insert(invites).values(invite).run();

    try {
      const info = await sendInviteEmail({ toEmail: email });
      console.log("Sent invite email", {
        inviteId: invite.id,
        messageId: info.messageId,
        response: info.response,
      });
    } catch (err) {
      console.error("Failed to send invite email", err);
      return NextResponse.json(
        {
          invite,
          warning: "Invite created, but the email failed to send. Please check SMTP configuration.",
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ invite }, { status: 201 });
  } catch (err) {
    return handleAuthError(err);
  }
}
