import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { devices } from "@/lib/db/schema";
import DeviceManager from "@/components/DeviceManager";

export default async function DevicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const rows = db
    .select()
    .from(devices)
    .where(eq(devices.userId, session.user.id))
    .orderBy(desc(devices.createdAt))
    .all();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Your e-reader devices</h1>
      <DeviceManager devices={rows} />
    </div>
  );
}
