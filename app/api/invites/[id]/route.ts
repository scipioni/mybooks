import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invites } from "@/lib/db/schema";
import { NotFoundError, handleAuthError, requireAdmin } from "@/lib/authz";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const invite = db.select().from(invites).where(eq(invites.id, id)).get();
    if (!invite) throw new NotFoundError("Invite not found");
    if (invite.redeemedAt) {
      return NextResponse.json({ error: "Cannot revoke an already-redeemed invite" }, { status: 400 });
    }

    db.delete(invites).where(eq(invites.id, id)).run();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleAuthError(err);
  }
}
