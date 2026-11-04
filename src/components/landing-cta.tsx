"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDictionary, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { DEFAULT_DEMO_PROFILE, DEMO_PROFILES, type DemoProfileId } from "@/server/demo-profiles";

async function startDemoSession(profile: DemoProfileId): Promise<boolean> {
  const { csrfToken } = await fetch("/api/auth/csrf").then((r) => r.json());
  const demo = await fetch("/api/demo/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
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
  const [starting, setStarting] = useState<string | null>(null);

  const pageLocale: Locale =
    typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "bn";

  async function start(locale: Locale, profile: DemoProfileId = DEFAULT_DEMO_PROFILE) {
    const key = `${locale}:${profile}`;
    setStarting(key);
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    const ok = await startDemoSession(profile).catch(() => false);
    if (ok) {
      window.location.href = "/dashboard";
      return;
    }
    setStarting(`failed:${locale}`);
  }

  const failedLocale = starting?.startsWith("failed:") ? (starting.slice(7) as Locale) : null;
  const busy = starting !== null && !starting.startsWith("failed:");
  const dict = getDictionary(pageLocale);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => start("en")} disabled={busy} className="h-14 px-6 text-lg sm:flex-1">
          {starting === "en:" + DEFAULT_DEMO_PROFILE && <Loader2 className="animate-spin" aria-hidden />}
          Try it in English
        </Button>
        <Button
          lang="bn"
          onClick={() => start("bn")}
          disabled={busy}
          variant="secondary"
          className="h-14 px-6 text-lg sm:flex-1"
        >
          {starting === "bn:" + DEFAULT_DEMO_PROFILE && <Loader2 className="animate-spin" aria-hidden />}
          বাংলায় দেখুন
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <p className="font-medium">{dict.landing.chooseProfile}</p>
        <ul className="flex flex-col gap-2">
          {DEMO_PROFILES.filter((p) => p.id !== DEFAULT_DEMO_PROFILE).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => start(pageLocale, p.id)}
                disabled={busy}
                className="w-full rounded-xl border bg-background px-4 py-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
              >
                <span className="flex w-full flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {pageLocale === "bn" ? p.nameBn : p.nameEn}
                    </span>
                    <Badge variant={p.badge === "recovering" ? "destructive" : "secondary"}>
                      {p.badge === "recovering" ? dict.auth.profileRecovering : dict.auth.profileStable}
                    </Badge>
                  </span>
                  <span className="text-sm font-normal break-words text-muted-foreground">
                    {pageLocale === "bn" ? p.storyBn : p.storyEn}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p role="status" className="min-h-6 text-sm text-muted-foreground">
        {busy && dict.landing.startingOther}
        {failedLocale && <span className="text-destructive">{getDictionary(failedLocale).landing.error}</span>}
        {!busy && !failedLocale && `${getDictionary("en").landing.note}`}
      </p>
    </div>
  );
}
