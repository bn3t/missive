"use client";

import { signOut } from "@/lib/auth/client";

async function handleSignOut() {
  await signOut();
  window.location.href = "/login";
}

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="w-full cursor-pointer text-left"
    >
      Log out
    </button>
  );
}
