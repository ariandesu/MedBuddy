import { redirect } from "next/navigation";
import { LandingCta } from "@/components/landing-cta";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { getSessionUser } from "@/server/auth";
import papers from "../../fixtures/sample-papers.json";

export const dynamic = "force-dynamic";

const STEPS = ["1", "2", "3"] as const;

export default async function Home() {
  if (await getSessionUser()) redirect("/dashboard");

  // Primary language follows the header toggle; the other stays visible smaller,
  // so visitors who can't read the current language can still find their way.
  const { locale } = await getLocaleAndDict();
  const other: Locale = locale === "bn" ? "en" : "bn";
  const primary = getDictionary(locale).landing;
  const secondary = getDictionary(other).landing;
  const box = papers["sample-cbc"].boxes.hemoglobin;

  return (
    <div className="grid items-center gap-x-12 gap-y-10 md:grid-cols-[1.05fr_1fr] md:pt-6">
      <section className="landing-rise flex flex-col gap-5">
        <h1 lang={locale} className="font-heading text-4xl font-bold leading-tight sm:text-5xl">
          {primary.headline}
        </h1>
        <p lang={other} className="font-heading text-2xl font-medium leading-snug text-primary">{secondary.headline}</p>
        <p className="text-muted-foreground">{primary.sub}</p>
        <LandingCta />
      </section>

      {/* The real sample paper, marked up the way the review screen marks it. */}
      <figure className="landing-rise relative pb-24 [animation-delay:150ms] sm:pr-8">
        <div className="relative rotate-[-1.5deg] overflow-hidden rounded-lg border bg-card shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/samples/sample-cbc.jpg"
            alt="A sample lab report, watermarked as not real patient data, with the hemoglobin result highlighted"
            className="block w-full"
          />
          <span
            aria-hidden
            className="paper-highlight landing-swipe"
            style={{
              left: `${(box.x - 0.008) * 100}%`,
              top: `${(box.y - 0.004) * 100}%`,
              width: `${(box.w + 0.016) * 100}%`,
              height: `${(box.h + 0.008) * 100}%`,
            }}
          />
        </div>
        <figcaption className="absolute bottom-0 right-0 max-w-xs rounded-2xl border-2 border-warning bg-card p-4 shadow-lg">
          <p className="font-heading font-semibold">{primary.calloutValue}</p>
          <p className="text-sm text-muted-foreground">{primary.calloutBody}</p>
          <p lang={other} className="mt-1 text-sm text-muted-foreground">{secondary.calloutBody}</p>
        </figcaption>
      </figure>

      <ol className="grid gap-6 border-t pt-8 sm:grid-cols-3 md:col-span-2">
        {STEPS.map((n) => (
          <li key={n} className="flex flex-col gap-1">
            <p className="font-heading text-xl font-semibold">
              <span className="text-primary">{primary[`step${n}`]}</span>
              <span lang={other} className="ml-2 text-base font-medium text-muted-foreground">{secondary[`step${n}`]}</span>
            </p>
            <p className="text-muted-foreground">{primary[`step${n}Body`]}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
