"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "@/lib/i18n";
import { DEFAULT_DEMO_PROFILE, DEMO_PROFILES, type DemoProfileId } from "@/server/demo-profiles";

/** `profiles` is off without a database, where every visitor shares one sample account. */
export function LoginForm({ dict, locale, profiles }: { dict: Dictionary; locale: "bn" | "en"; profiles: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? dict.auth.error : null
  );
  const [pending, setPending] = useState(false);
  const [startingProfile, setStartingProfile] = useState<DemoProfileId | null>(null);

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

  async function getCsrf(): Promise<string | null> {
    if (csrfToken) return csrfToken;
    try {
      const data = await fetch("/api/auth/csrf").then((r) => r.json());
      if (data?.csrfToken) {
        setCsrfToken(data.csrfToken);
        return data.csrfToken as string;
      }
    } catch {}
    return null;
  }

  async function submit(email: string, password: string) {
    // Don't silently drop a fast tap made before the token loaded: fetch it now.
    const token = await getCsrf();
    if (!token) {
      setError(dict.auth.error);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const callbackUrl = searchParams.get("callbackUrl");
      const isValidCallback =
        typeof callbackUrl === "string" &&
        callbackUrl.startsWith("/") &&
        !callbackUrl.startsWith("//");
      const finalCallbackUrl = isValidCallback ? callbackUrl : "/dashboard";
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrfToken: token,
          email,
          password,
          callbackUrl: finalCallbackUrl,
          json: "true",
        }),
      });
      const data = await res.json().catch(() => ({}));
      const ok =
        res.ok &&
        typeof data?.url === "string" &&
        !data.url.includes("/error");
      if (ok) {
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

  async function startDemo(profile?: DemoProfileId) {
    setPending(true);
    setStartingProfile(profile ?? null);
    setError(null);
    try {
      const res = await fetch("/api/demo/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile ? { profile } : {}),
      });
      if (!res.ok) throw new Error("Failed to start demo");
      const data = await res.json();
      await submit(data.email, data.password);
    } catch {
      setError(dict.auth.demoStartError);
    } finally {
      setPending(false);
      setStartingProfile(null);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    void submit(String(data.get("email") ?? ""), String(data.get("password") ?? ""));
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-base">{dict.auth.email}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required disabled={pending} className="h-14 rounded-[1.125rem] border-input bg-popover px-4 text-base" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-base">{dict.auth.password}</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required disabled={pending} className="h-14 rounded-[1.125rem] border-input bg-popover px-4 text-base" />
        </div>
        <Button type="submit" disabled={pending || !csrfToken} className="h-14 w-full text-lg font-semibold">
          {dict.auth.submit}
        </Button>
        <p className="text-center">
          {dict.auth.noAccount}{" "}
          <Link href="/signup" className="inline-flex min-h-12 items-center font-semibold underline underline-offset-4">
            {dict.auth.signUp}
          </Link>
        </p>
      </form>

      <section aria-labelledby="try-h" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <div>
          <h2 id="try-h" className="font-heading text-xl font-semibold">{dict.auth.tryFirst}</h2>
          <p className="text-muted-foreground">{dict.auth.demoExplain}</p>
        </div>
        <Button onClick={() => startDemo(DEFAULT_DEMO_PROFILE)} className="h-14 w-full text-lg font-semibold" disabled={pending}>
          {startingProfile ? dict.auth.profileStarting : dict.auth.tryDemo}
        </Button>
        {profiles && (
          <div id="profiles" className="scroll-mt-20">
            <p className="font-heading text-lg font-semibold">{dict.auth.chooseProfile}</p>
            <p className="text-sm text-muted-foreground">{dict.auth.chooseProfileHint}</p>
            <ul className="mt-1 divide-y">
              {DEMO_PROFILES.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => startDemo(p.id)}
                    disabled={pending}
                    className="flex min-h-[4.25rem] w-full items-center gap-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{locale === "bn" ? p.nameBn : p.nameEn}</span>
                      <span className="block break-words text-sm text-muted-foreground">
                        {startingProfile === p.id ? dict.auth.profileStarting : locale === "bn" ? p.storyBn : p.storyEn}
                      </span>
                    </span>
                    <Badge variant="secondary">
                      {p.badge === "recovering" ? dict.auth.profileRecovering : dict.auth.profileStable}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
