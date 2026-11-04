"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDictionary, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { DEFAULT_DEMO_PROFILE } from "@/server/demo-profiles";

async function startDemoSession(): Promise<boolean> {
  const { csrfToken } = await fetch("/api/auth/csrf").then((r) => r.json());
  const demo = await fetch("/api/demo/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile: DEFAULT_DEMO_PROFILE }),
  });
  if (!demo.ok) return false;
  const { email, password } = await demo.json();
  const res = await fetch("/api/auth/callback/credentials", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, email, password, callbackUrl: "/dashboard", json: "true" }),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok && typeof data?.url === "string" && !data.url.includes("/error");
}

/** One button per language: picking it sets the app language and opens the demo. */
export function LandingCta() {
  const [starting, setStarting] = useState<Locale | null>(null);
  const [failed, setFailed] = useState<Locale | null>(null);

  async function start(locale: Locale) {
    setStarting(locale);
    setFailed(null);
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    const ok = await startDemoSession().catch(() => false);
    if (ok) {
      window.location.href = "/dashboard";
      return;
    }
    setFailed(locale);
    setStarting(null);
  }

  const shown = starting ?? failed;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => start("en")} disabled={starting !== null} className="h-14 px-6 text-lg sm:flex-1">
          {starting === "en" && <Loader2 className="animate-spin" aria-hidden />}
          Try it in English
        </Button>
        <Button
          lang="bn"
          onClick={() => start("bn")}
          disabled={starting !== null}
          variant="secondary"
          className="h-14 px-6 text-lg sm:flex-1"
        >
          {starting === "bn" && <Loader2 className="animate-spin" aria-hidden />}
          বাংলায় দেখুন
        </Button>
      </div>
      <p role="status" lang={shown ?? "en"} className="min-h-6 text-sm text-muted-foreground">
        {starting && getDictionary(starting).landing.starting}
        {failed && !starting && <span className="text-destructive">{getDictionary(failed).landing.error}</span>}
        {!starting && !failed && `${getDictionary("en").landing.note}`}
      </p>
    </div>
  );
}
