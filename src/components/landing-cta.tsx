"use client";

import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

function openDashboard() {
  window.location.href = "/dashboard";
}

const LABEL: Record<Locale, string> = { en: "Try it in English", bn: "বাংলায় দেখুন" };

/**
 * One button per language: picking it sets the app language and opens the demo.
 * The page's own language comes first. `profiles` is off without a database,
 * where every visitor shares one sample account, so there is no one else to open.
 */
export function LandingStart({ locale, profiles }: { locale: Locale; profiles: boolean }) {
  const [starting, setStarting] = useState<string | null>(null);

  async function start(chosen: Locale, profile: DemoProfileId = DEFAULT_DEMO_PROFILE) {
    setStarting(`${chosen}:${profile}`);
    rememberLocale(chosen);
    const ok = await startDemoSession(profile).catch(() => false);
    if (ok) {
      openDashboard();
      return;
    }
    setStarting(`failed:${chosen}`);
  }

  const failedLocale = starting?.startsWith("failed:") ? (starting.slice(7) as Locale) : null;
  const busy = starting !== null && !starting.startsWith("failed:");
  const dict = getDictionary(locale);
  const other: Locale = locale === "bn" ? "en" : "bn";

  return (
    <div className="flex flex-col gap-3">
      {([locale, other] as const).map((lang, i) => (
        <Button
          key={lang}
          lang={lang}
          onClick={() => start(lang)}
          disabled={busy}
          variant={i === 0 ? "default" : "secondary"}
          className="h-14 w-full text-lg font-semibold"
        >
          {starting === `${lang}:${DEFAULT_DEMO_PROFILE}` && <Loader2 className="animate-spin" aria-hidden />}
          {LABEL[lang]}
        </Button>
      ))}
      <p role="status" className="min-h-6 text-center text-sm text-muted-foreground">
        {busy && dict.landing.startingOther}
        {failedLocale && <span className="font-medium text-destructive-ink">{getDictionary(failedLocale).landing.error}</span>}
        {!busy && !failedLocale && (profiles ? dict.landing.note : dict.landing.noteShared)}
      </p>
      {profiles && (
        <section aria-labelledby="neighbors-h" className="mt-2">
          <h2 id="neighbors-h" className="mb-2 font-heading text-lg font-semibold">{dict.landing.chooseProfile}</h2>
          <ul className="divide-y rounded-2xl border bg-card px-4">
            {DEMO_PROFILES.filter((p) => p.id !== DEFAULT_DEMO_PROFILE).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => start(locale, p.id)}
                  disabled={busy}
                  className="flex min-h-[4.25rem] w-full items-center gap-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{locale === "bn" ? p.nameBn : p.nameEn}</span>
                    <span className="block break-words text-sm text-muted-foreground">{locale === "bn" ? p.storyBn : p.storyEn}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
