import Link from "next/link";
import { Mail, KeyRound } from "lucide-react";
import { SignOutButton } from "./sign-out-button";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navItems = [
  { href: "/emails", label: "Emails", icon: Mail },
  { href: "/settings/api-keys", label: "API Keys", icon: KeyRound },
];

export function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="flex w-60 flex-col border-r bg-muted/30">
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/emails" className="text-lg font-semibold tracking-tight">
          Missive
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {user.name ?? "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
