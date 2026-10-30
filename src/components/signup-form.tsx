"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Dictionary } from "@/lib/i18n";

export function SignupForm({ dict }: { dict: Dictionary }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(email: string, password: string, confirmPassword: string) {
    setPending(true);
    setError(null);
    try {
      if (password !== confirmPassword) {
        setError(dict.auth.passwordsDoNotMatch);
        return;
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 409) {
        setError(dict.auth.userExists);
        return;
      }
      if (!res.ok) {
        setError(dict.auth.signUpError);
        return;
      }

      // Auto sign in after registration using the credentials callback.
      const csrfRes = await fetch("/api/auth/csrf");
      const csrfData = await csrfRes.json().catch(() => ({}));
      const loginRes = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrfToken: csrfData.csrfToken,
          email,
          password,
          callbackUrl: "/dashboard",
          json: "true",
        }),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (
        loginRes.ok &&
        typeof loginData.url === "string" &&
        !loginData.url.includes("/error")
      ) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(dict.auth.signUpError);
      }
    } catch {
      setError(dict.auth.signUpError);
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    void submit(
      String(data.get("email") ?? ""),
      String(data.get("password") ?? ""),
      String(data.get("confirmPassword") ?? "")
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{dict.auth.email}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{dict.auth.password}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={pending}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">{dict.auth.confirmPassword}</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={pending}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {dict.auth.signUp}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {dict.auth.alreadyHaveAccount}{" "}
        <a href="/login" className="underline">
          {dict.auth.logIn}
        </a>
      </p>
    </div>
  );
}
