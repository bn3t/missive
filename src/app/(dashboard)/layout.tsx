import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={session.user} />
      <main className="flex-1 overflow-auto">
        <div className="container max-w-6xl py-8">{children}</div>
      </main>
    </div>
  );
}
