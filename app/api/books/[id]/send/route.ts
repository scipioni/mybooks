import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { books, devices } from "@/lib/db/schema";
import { ForbiddenError, NotFoundError, handleAuthError, requireUser } from "@/lib/authz";
import { sendBookToDevice } from "@/lib/mailer";

const sendSchema = z.object({ deviceId: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const book = db.select().from(books).where(eq(books.id, id)).get();
    if (!book) throw new NotFoundError("Book not found");
    if (book.ownerId !== user.id) throw new ForbiddenError("You do not own this book");

    const body = await req.json().catch(() => null);
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "A device is required" }, { status: 400 });
    }

    const device = db.select().from(devices).where(eq(devices.id, parsed.data.deviceId)).get();
    if (!device) throw new NotFoundError("Device not found");
    if (device.userId !== user.id) throw new ForbiddenError("You do not own this device");

    try {
      await sendBookToDevice({ toEmail: device.email, bookTitle: book.title, filePath: book.filePath });
    } catch (err) {
      console.error("Failed to send book to device", err);
      return NextResponse.json(
        { error: "Failed to send the email. Please check SMTP configuration and try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleAuthError(err);
  }
}
