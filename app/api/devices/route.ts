import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { devices } from "@/lib/db/schema";
import { handleAuthError, requireUser } from "@/lib/authz";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = db
      .select()
      .from(devices)
      .where(eq(devices.userId, user.id))
      .orderBy(desc(devices.createdAt))
      .all();
    return NextResponse.json({ devices: rows });
  } catch (err) {
    return handleAuthError(err);
  }
}

const createSchema = z.object({ label: z.string().min(1), email: z.string().email() });

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "A label and valid email are required" }, { status: 400 });
    }

    const device = {
      id: randomUUID(),
      userId: user.id,
      label: parsed.data.label,
      email: parsed.data.email,
      createdAt: new Date(),
    };
    db.insert(devices).values(device).run();
    return NextResponse.json({ device }, { status: 201 });
  } catch (err) {
    return handleAuthError(err);
  }
}
