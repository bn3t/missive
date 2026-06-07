import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { ProfileDetailsForm } from "./profile-details-form";
import { PasswordForm } from "./password-form";
import { PageHeader } from "@/components/page-header";

export default async function ProfilePage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-8 max-w-lg">
      <PageHeader title="Profile" description="Manage your account settings" />
      <ProfileDetailsForm
        defaultName={session.user.name ?? ""}
        email={session.user.email}
      />
      <PasswordForm />
    </div>
  );
}
