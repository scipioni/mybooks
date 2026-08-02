import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { devices } from "@/lib/db/schema";
import { ForbiddenError, NotFoundError, handleAuthError, requireUser } from "@/lib/authz";

const patchSchema = z.object({
  label: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const device = db.select().from(devices).where(eq(devices.id, id)).get();
    if (!device) throw new NotFoundError("Device not found");
    if (device.userId !== user.id) throw new ForbiddenError("You do not own this device");

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    db.update(devices).set(parsed.data).where(eq(devices.id, id)).run();
    const updated = db.select().from(devices).where(eq(devices.id, id)).get();
    return NextResponse.json({ device: updated });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const device = db.select().from(devices).where(eq(devices.id, id)).get();
    if (!device) throw new NotFoundError("Device not found");
    if (device.userId !== user.id) throw new ForbiddenError("You do not own this device");

    db.delete(devices).where(eq(devices.id, id)).run();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleAuthError(err);
  }
}
