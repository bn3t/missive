import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { ProfileDetailsForm } from "./profile-details-form";
import { PasswordForm } from "./password-form";

export default async function ProfilePage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account settings
        </p>
      </div>
      <ProfileDetailsForm
        defaultName={session.user.name ?? ""}
        email={session.user.email}
      />
      <PasswordForm />
    </div>
  );
}
