import { redirect } from "next/navigation";
import { desc, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invites, users } from "@/lib/db/schema";
import InviteForm from "@/components/InviteForm";
import InvitesList from "@/components/InvitesList";

export default async function AdminInvitesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/denied");
  }

  const pending = db
    .select({ invite: invites, inviterEmail: users.email })
    .from(invites)
    .leftJoin(users, eq(invites.invitedBy, users.id))
    .where(isNull(invites.redeemedAt))
    .orderBy(desc(invites.createdAt))
    .all();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Invites</h1>
      <InviteForm />

      <h2 className="mb-3 mt-8 text-lg font-medium">Pending invites</h2>
      <InvitesList
        invites={pending.map((p) => ({ id: p.invite.id, email: p.invite.email, inviterEmail: p.inviterEmail }))}
      />
    </div>
  );
}
