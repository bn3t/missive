"use client";

import { signIn } from "@/lib/auth/client";
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

interface LoginFormProps {
  signupEnabled: boolean;
}

export function LoginForm({ signupEnabled }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // fallow-ignore-next-line code-duplication
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Invalid credentials");
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
        <CardDescription>
          Sign in to your transactional email dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="email"
            label="Email"
            type="email"
            placeholder="admin@example.com"
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
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
      {signupEnabled && (
        <CardFooter>
          <div className="flex w-full justify-center border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="underline text-foreground">
                Sign up
              </Link>
            </p>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
