import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SignInButton from "@/components/SignInButton";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/library");
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Sign in to mybooks</h1>
      <p className="text-sm text-zinc-600">
        Access is invite-only. Sign in with the Google account that was invited, or the
        administrator&apos;s account.
      </p>
      <SignInButton />
    </div>
  );
}
