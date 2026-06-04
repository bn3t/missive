"use client";

import { signUp } from "@/lib/auth/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SignUpForm() {
  // fallow-ignore-next-line code-duplication
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirmation) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    const result = await signUp.email({ email, password, name });

    if (result.error) {
      setError(result.error.message ?? "Something went wrong");
      setLoading(false);
    } else {
      window.location.href = "/emails";
    }
  }

  // fallow-ignore-next-line code-duplication
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Missive</CardTitle>
        <CardDescription>Create your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="name"
            label="Name"
            placeholder="John Doe"
            value={name}
            onChange={setName}
            required
          />
          <FormField
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
            required
          />
          <FormField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            required
          />
          <FormField
            id="passwordConfirmation"
            label="Confirm password"
            type="password"
            value={passwordConfirmation}
            onChange={setPasswordConfirmation}
            required
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <div className="flex w-full justify-center border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline text-foreground">
              Sign in
            </Link>
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
