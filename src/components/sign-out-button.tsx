"use client";

import { signOut } from "@/lib/auth/client";

export function SignOutButton() {
  async function handleSignOut() {
    await signOut();
    window.location.href = "/login";
  }

  return (
    <span onClick={handleSignOut} className="w-full cursor-pointer">
      Log out
    </span>
  );
}
