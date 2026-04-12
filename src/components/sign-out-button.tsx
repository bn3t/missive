"use client";

import { signOut } from "@/lib/auth/client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  async function handleSignOut() {
    await signOut();
    window.location.href = "/login";
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleSignOut}>
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
