import { redirect } from "next/navigation";
import { LandingStart } from "@/components/landing-cta";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { getSessionUser } from "@/server/auth";
import { isDemoDataMode } from "@/server/env";
import { Tile } from "@/components/tile";
import { ClipboardCheck, MessageCircleQuestion, ScanSearch } from "lucide-react";
import papers from "../../fixtures/sample-papers.json";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "1", Icon: ScanSearch },
  { n: "2", Icon: ClipboardCheck },
  { n: "3", Icon: MessageCircleQuestion },
] as const;

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
    <div className="grid items-start gap-x-12 gap-y-5 md:grid-cols-[1.05fr_1fr] md:pt-4">
      <div className="landing-rise flex flex-col gap-4">
        <div>
          <h1 lang={locale} className="font-heading text-[2.12rem] font-bold leading-[1.2] lg:text-5xl [html[lang=bn]_&]:leading-[1.3]">
            {primary.headline}
          </h1>
          <p lang={other} className="mt-1 text-lg leading-snug text-muted-foreground">{secondary.headline}</p>
        </div>

        {/* The real sample paper, marked up the way the review screen marks it. */}
        <figure className="relative mb-0 pb-20 md:hidden">
          <PaperWithHighlight box={box} />
          <Callout value={primary.calloutValue} body={primary.calloutBody} />
        </figure>

        <LandingStart locale={locale} profiles={!isDemoDataMode()} />
      </div>

      <figure className="landing-rise relative hidden pb-24 [animation-delay:150ms] md:block md:pr-8">
        <PaperWithHighlight box={box} />
        <Callout value={primary.calloutValue} body={primary.calloutBody} />
      </figure>

      <ol className="divide-y rounded-2xl border bg-card px-4 md:col-span-2 md:grid md:grid-cols-3 md:gap-6 md:divide-y-0">
        {STEPS.map(({ n, Icon }) => (
          <li key={n} className="flex items-start gap-3 py-3">
            <Tile><Icon className="size-5" /></Tile>
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-semibold">
                {primary[`step${n}`]}
                <span lang={other} className="ml-2 text-sm font-normal text-muted-foreground">{secondary[`step${n}`]}</span>
              </h2>
              <p className="text-muted-foreground">{primary[`step${n}Body`]}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PaperWithHighlight({ box }: { box: { x: number; y: number; w: number; h: number } }) {
  return (
    <div className="relative rotate-[-1.5deg] overflow-hidden rounded-2xl bg-popover shadow-lg">
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
  );
}

function Callout({ value, body }: { value: string; body: string }) {
  return (
    <figcaption className="absolute right-0 bottom-0 left-4 rounded-2xl bg-popover p-3 shadow-lg md:left-auto md:max-w-xs">
      <p className="font-heading font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </figcaption>
  );
}
