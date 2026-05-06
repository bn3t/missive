import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { SignUpForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  if (!env.SIGNUP_ENABLED) {
    redirect("/login");
  }

  return <SignUpForm />;
}
