"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import type { Dictionary } from "@/lib/i18n";

export function LoginForm({ dict }: { dict: Dictionary }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? dict.auth.error : null
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/csrf")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.csrfToken) setCsrfToken(data.csrfToken);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(email: string, password: string) {
    if (!csrfToken) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrfToken,
          email,
          password,
          callbackUrl: "/dashboard",
          json: "true",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(dict.auth.error);
      }
    } catch {
      setError(dict.auth.error);
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    void submit(String(data.get("email") ?? ""), String(data.get("password") ?? ""));
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
            autoComplete="current-password"
            required
            disabled={pending}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {dict.auth.submit}
        </Button>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(DEMO_EMAIL, DEMO_PASSWORD);
        }}
      >
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={pending}
        >
          {dict.header.tryDemo}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {dict.auth.demoHint}
      </p>
    </div>
  );
}
