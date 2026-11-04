"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Footprints, GlassWater, Moon } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { isRedFlag, URGENT_SYMPTOMS } from "@/lib/safety/redflags";
import { toLocaleDigits } from "@/lib/digits";
import { localISODate, useTodayCheckin, type CheckinEntry } from "@/lib/use-today-checkin";
import { cn } from "@/lib/utils";
import { PageTitle } from "@/components/page-title";
import { Stepper } from "@/components/stepper";
import { OptionCard } from "@/components/option-card";
import { Chip } from "@/components/chip";
import { StickyActionBar } from "@/components/sticky-action-bar";
import { UrgentDialog } from "@/components/urgent-dialog";

type SymptomLevel = "none" | "mild" | "moderate" | "severe";

const STEPS = 4;
const SAVED_URL = "/checkin/saved";

const OTHER_SYMPTOMS = [
  { value: "headache", key: "symptomHeadache" },
  { value: "fever", key: "symptomFever" },
  { value: "cough", key: "symptomCough" },
  { value: "tiredness", key: "symptomTiredness" },
] as const;

const URGENT_VALUES: string[] = URGENT_SYMPTOMS.map((s) => s.value);

function CheckinForm({ existing, yesterday, editing }: {
  existing: CheckinEntry | null;
  yesterday: CheckinEntry | null;
  editing: boolean;
}) {
  const { dict, locale } = useLocale();
  const t = dict.checkin;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sleepHours, setSleepHours] = useState<number | null>(existing?.sleepHours ?? null);
  const [waterGlasses, setWaterGlasses] = useState<number | null>(existing?.waterGlasses ?? null);
  const [activityMinutes, setActivityMinutes] = useState<number | null>(existing?.activityMinutes ?? null);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | null>(existing?.energy ?? null);
  const [symptomLevel, setSymptomLevel] = useState<SymptomLevel | null>(existing?.symptomLevel ?? null);
  const [symptoms, setSymptoms] = useState<string[]>(existing?.symptoms ?? []);
  const [note, setNote] = useState(existing?.note ?? "");

  // The step lives in the URL so the phone's back gesture moves between steps.
  const urlStep = Number(searchParams.get("step"));
  const step = urlStep >= 1 && urlStep <= STEPS ? urlStep : 1;

  // A reload clears the form, so it must not land past the urgent signs.
  useEffect(() => {
    if (step !== 1) window.history.replaceState(null, "", editing ? "/checkin?edit=1" : "/checkin");
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  function goTo(next: number) {
    const query = new URLSearchParams({ step: String(next) });
    if (editing) query.set("edit", "1");
    window.history.pushState(null, "", `/checkin?${query}`);
  }

  const redFlag = isRedFlag({ symptomLevel, symptoms });
  const nothingEntered =
    sleepHours == null &&
    waterGlasses == null &&
    activityMinutes == null &&
    energy == null &&
    symptomLevel == null &&
    symptoms.length === 0 &&
    !note.trim();

  // Safety first: warn the moment an urgent sign is picked, not only on Save,
  // so nobody can leave with Skip without seeing it.
  function toggleSymptom(value: string) {
    const adding = !symptoms.includes(value);
    if (adding && isRedFlag({ symptoms: [value] })) setOpen(true);
    setSymptoms((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );
  }

  function chooseSymptomLevel(level: SymptomLevel) {
    const next = symptomLevel === level ? null : level;
    if (isRedFlag({ symptomLevel: next })) setOpen(true);
    setSymptomLevel(next);
  }

  async function handleSave() {
    // Safety first: the urgent dialog opens regardless of the network result.
    if (redFlag) setOpen(true);
    setSaving(true);
    setError(null);
    try {
      // Only entered values are saved. When changing today's entry, null clears a removed value.
      const body: Record<string, unknown> = { date: localISODate() };
      const clear = existing ? null : undefined;
      body.sleepHours = sleepHours ?? clear;
      body.waterGlasses = waterGlasses ?? clear;
      body.activityMinutes = activityMinutes ?? clear;
      body.energy = energy ?? clear;
      body.symptomLevel = symptomLevel ?? clear;
      if (symptoms.length || existing) body.symptoms = symptoms;
      body.note = note.trim() || clear;

      const res = await fetch("/api/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(t.saveFailed);
      await res.json();
      if (redFlag) setSaved(true);
      else router.push(SAVED_URL);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setSaving(false);
    }
  }

  const n = (v: number) => toLocaleDigits(String(v), locale);
  const urgentPicked = symptoms.some((s) => URGENT_VALUES.includes(s));
  const otherPicked = symptoms.some((s) => !URGENT_VALUES.includes(s));
  const stepHasEntry =
    step === 2
      ? symptomLevel != null || otherPicked
      : step === 3
        ? sleepHours != null || waterGlasses != null || activityMinutes != null
        : false;
  const yesterdayHint = (v: number | undefined) =>
    v != null ? t.yesterday.replace("{{value}}", toLocaleDigits(String(v), locale)) : undefined;
  const heading = "font-heading text-[1.53rem] font-semibold leading-tight [html[lang=bn]_&]:leading-snug";
  const back = step > 1
    ? { onClick: () => window.history.back(), label: dict.common.back }
    : { href: editing ? SAVED_URL : "/dashboard", label: dict.common.back };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 pb-4 md:pb-0">
      <PageTitle title={dict.dashboard.checkinToday} back={back} />

      <div className="flex flex-col gap-2">
        <p aria-live="polite" className="font-medium">
          {t.stepOf.replace("{{n}}", n(step)).replace("{{total}}", n(STEPS))}
        </p>
        <Progress value={(step / STEPS) * 100} aria-label={t.stepOf.replace("{{n}}", n(step)).replace("{{total}}", n(STEPS))} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className={heading}>{t.urgentQuestion}</h2>
            <p className="mt-1">{t.urgentHelp}</p>
          </div>
          <div className="flex flex-col gap-2">
            {URGENT_SYMPTOMS.map((s) => (
              <OptionCard
                key={s.value}
                urgent
                label={t[s.key]}
                active={symptoms.includes(s.value)}
                onToggle={() => toggleSymptom(s.value)}
              />
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className={heading}>{t.feelQuestion}</legend>
            <p className="mb-1">{t.feelHelp}</p>
            {(
              [
                { value: "none", label: t.symptomNoneLong },
                { value: "mild", label: t.symptomMild, description: t.mildDesc },
                { value: "moderate", label: t.symptomModerate, description: t.moderateDesc },
                { value: "severe", label: t.symptomSevere, description: t.severeDesc },
              ] as const
            ).map((o) => (
              <OptionCard
                key={o.value}
                label={o.label}
                description={"description" in o ? o.description : undefined}
                active={symptomLevel === o.value}
                onToggle={() => chooseSymptomLevel(o.value)}
              />
            ))}
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-heading text-lg font-semibold">{t.otherQuestion}</legend>
            <div className="flex flex-wrap gap-2">
              {OTHER_SYMPTOMS.map((s) => (
                <Chip key={s.value} mark active={symptoms.includes(s.value)} onToggle={() => toggleSymptom(s.value)}>
                  {t[s.key]}
                </Chip>
              ))}
            </div>
          </fieldset>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className={heading}>{t.bodyQuestion}</h2>
            <p className="mt-1">{t.bodyHelp}</p>
          </div>
          <div className="rounded-2xl border bg-card-lead px-4">
            <Stepper
              id="sleep"
              label={t.sleepLabel}
              hint={yesterdayHint(yesterday?.sleepHours)}
              unit={t.hrs}
              icon={<Moon className="size-5" aria-hidden />}
              value={sleepHours}
              start={7}
              step={0.5}
              min={0}
              max={24}
              onChange={setSleepHours}
              addLabel={t.add}
              locale={locale}
            />
          </div>
          <div className="rounded-2xl border bg-card-lead px-4">
            <Stepper
              id="water"
              label={t.waterLabel}
              hint={yesterdayHint(yesterday?.waterGlasses)}
              unit={t.glasses}
              icon={<GlassWater className="size-5" aria-hidden />}
              value={waterGlasses}
              start={6}
              step={1}
              min={0}
              max={30}
              onChange={setWaterGlasses}
              addLabel={t.add}
              locale={locale}
            />
          </div>
          <div className="rounded-2xl border bg-card-lead px-4">
            <Stepper
              id="activity"
              label={t.activityLabel}
              hint={yesterdayHint(yesterday?.activityMinutes)}
              unit={t.min}
              icon={<Footprints className="size-5" aria-hidden />}
              value={activityMinutes}
              start={30}
              step={10}
              min={0}
              max={600}
              onChange={setActivityMinutes}
              addLabel={t.add}
              locale={locale}
            />
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="flex flex-col gap-4">
          <fieldset>
            <legend className={cn(heading, "mb-3")}>{t.energyQuestion}</legend>
            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 3, 4] as const).map((v) => {
                const active = energy === v;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={active}
                    aria-label={`${t.energy} ${n(v)}`}
                    onClick={() => setEnergy(active ? null : v)}
                    className={cn(
                      "flex min-h-[4.5rem] items-center justify-center rounded-[20px] border font-heading text-4xl font-medium tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-card-lead"
                    )}
                  >
                    {n(v)}
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-muted-foreground">
              <span>{t.energyLowWord}</span>
              <span>{t.energyHighWord}</span>
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="checkin-note" className="font-medium">{t.noteQuestion}</label>
            <Textarea
              id="checkin-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePlaceholder}
              className="min-h-28 rounded-[1.125rem] border-input bg-popover text-base"
            />
          </div>
        </section>
      )}

      <StickyActionBar>
        {step === 1 && (
          <Button onClick={() => goTo(2)} className="h-14 w-full text-lg font-semibold">
            {urgentPicked ? t.next : t.noneOfThese}
          </Button>
        )}
        {(step === 2 || step === 3) && (
          <Button
            variant={stepHasEntry ? "default" : "secondary"}
            onClick={() => goTo(step + 1)}
            className="h-14 w-full text-lg font-semibold"
          >
            {stepHasEntry ? t.next : t.skip}
          </Button>
        )}
        {step === 4 &&
          (nothingEntered && !existing ? (
            <Button variant="secondary" onClick={() => router.push("/dashboard")} className="h-14 w-full text-lg font-semibold">
              {t.finishEmpty}
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="h-14 w-full text-lg font-semibold">
              {saving ? dict.common.loading : t.save}
            </Button>
          ))}
      </StickyActionBar>

      <UrgentDialog
        open={open}
        dict={dict}
        locale={locale}
        onUnderstood={() => {
          setOpen(false);
          // Before saving, stay on the form so the check-in can still be saved.
          if (saved) router.push(SAVED_URL);
        }}
      />
    </div>
  );
}

function CheckinLoader() {
  const router = useRouter();
  const editing = useSearchParams().get("edit") === "1";
  const { loading, today, yesterday } = useTodayCheckin();

  // Already done today: show it, and offer to change it from there.
  const showSaved = !loading && today != null && !editing;
  useEffect(() => {
    if (showSaved) router.replace(SAVED_URL);
  }, [showSaved, router]);

  if (loading || showSaved) return <Skeleton className="mx-auto h-96 w-full max-w-xl rounded-2xl" />;
  return <CheckinForm existing={today} yesterday={yesterday} editing={editing} />;
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 w-full max-w-xl rounded-2xl" />}>
      <CheckinLoader />
    </Suspense>
  );
}
