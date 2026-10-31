"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Moon,
  GlassWater,
  Footprints,
  Minus,
  Plus,
  Phone,
  Check,
  TriangleAlert,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { isRedFlag, urgentMessage } from "@/lib/safety/redflags";
import { toLocaleDigits } from "@/lib/digits";
import { cn } from "@/lib/utils";

type SymptomLevel = "none" | "mild" | "moderate" | "severe";

/** Values are the canonical English keys stored in the DB and used by redflags.ts. */
const URGENT_SYMPTOMS = [
  { value: "chest pain", key: "symptomChestPain" },
  { value: "difficulty breathing", key: "symptomDifficultyBreathing" },
  { value: "fainting", key: "symptomFainting" },
  { value: "severe bleeding", key: "symptomSevereBleeding" },
  { value: "confusion", key: "symptomConfusion" },
  { value: "stroke signs", key: "symptomStrokeSigns" },
] as const;

const OTHER_SYMPTOMS = [
  { value: "headache", key: "symptomHeadache" },
  { value: "fever", key: "symptomFever" },
  { value: "cough", key: "symptomCough" },
] as const;

type StepperProps = {
  id: string;
  label: string;
  unit: string;
  icon: React.ReactNode;
  value: number | null;
  start: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number | null) => void;
  addLabel: string;
  locale: "bn" | "en";
};

/** − value + control. Starts empty ("not set") so nothing is saved by accident. */
function Stepper({
  id,
  label,
  unit,
  icon,
  value,
  start,
  step,
  min,
  max,
  onChange,
  addLabel,
  locale,
}: StepperProps) {
  return (
    <div
      className="flex min-h-16 items-center gap-3 py-3"
      role="group"
      aria-labelledby={`${id}-label`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span id={`${id}-label`} className="flex-1 font-medium">
        {label}
      </span>
      {value == null ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 min-w-24 rounded-full"
          onClick={() => onChange(start)}
        >
          <Plus aria-hidden /> {addLabel}
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-full"
            aria-label={`${label} −`}
            onClick={() =>
              value - step < min ? onChange(null) : onChange(value - step)
            }
          >
            <Minus aria-hidden />
          </Button>
          <output
            aria-live="polite"
            className="min-w-16 text-center font-heading text-xl font-semibold tabular-nums"
          >
            {toLocaleDigits(String(value), locale)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          </output>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 rounded-full"
            aria-label={`${label} +`}
            disabled={value + step > max}
            onClick={() => onChange(value + step)}
          >
            <Plus aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}

function ChoiceRow<T extends string | number>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <fieldset className="py-3">
      <legend className="mb-2 font-medium">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? null : o.value)}
              className={cn(
                "min-h-12 rounded-xl border px-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function SymptomChip({
  label,
  active,
  urgent,
  onToggle,
}: {
  label: string;
  active: boolean;
  urgent?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        "flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? urgent
            ? "border-destructive bg-destructive text-white"
            : "border-primary bg-primary text-primary-foreground"
          : urgent
            ? "border-destructive/40 bg-card hover:bg-destructive/5"
            : "border-border bg-card hover:bg-muted"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md border",
          active ? "border-current" : "border-muted-foreground/50"
        )}
      >
        {active && <Check className="size-4" />}
      </span>
      {label}
    </button>
  );
}

export default function CheckinPage() {
  const { dict, locale } = useLocale();
  const t = dict.checkin;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [waterGlasses, setWaterGlasses] = useState<number | null>(null);
  const [activityMinutes, setActivityMinutes] = useState<number | null>(null);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | null>(null);
  const [symptomLevel, setSymptomLevel] = useState<SymptomLevel | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const redFlag = isRedFlag({ symptomLevel, symptoms });
  const nothingEntered =
    sleepHours == null &&
    waterGlasses == null &&
    activityMinutes == null &&
    energy == null &&
    symptomLevel == null &&
    symptoms.length === 0 &&
    !note.trim();

  function toggleSymptom(value: string) {
    setSymptoms((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );
  }

  async function handleSave() {
    // Safety first: the urgent dialog opens regardless of the network result.
    if (redFlag) setOpen(true);
    setSaving(true);
    setError(null);
    try {
      // Send the phone's own date so a late-night check-in lands on the right day.
      const d = new Date();
      const body: Record<string, unknown> = {
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      };
      if (sleepHours != null) body.sleepHours = sleepHours;
      if (waterGlasses != null) body.waterGlasses = waterGlasses;
      if (activityMinutes != null) body.activityMinutes = activityMinutes;
      if (energy != null) body.energy = energy;
      if (symptomLevel != null) body.symptomLevel = symptomLevel;
      if (symptoms.length) body.symptoms = symptoms;
      if (note.trim()) body.note = note.trim();

      const res = await fetch("/api/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(t.saveFailed);
      await res.json();
      if (!redFlag) router.push("/records?tab=timeline");
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setSaving(false);
    }
  }

  const n = (v: number) => toLocaleDigits(String(v), locale);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <header>
        <h1 className="font-heading text-3xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-muted-foreground">{t.optionalNote}</p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="rounded-2xl border bg-card px-4 py-1">
        <div className="divide-y">
          <Stepper
            id="sleep"
            label={t.sleepLabel}
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
          <Stepper
            id="water"
            label={t.waterLabel}
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
          <Stepper
            id="activity"
            label={t.activityLabel}
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

      <section className="rounded-2xl border bg-card px-4 py-1">
        <ChoiceRow
          legend={t.energy}
          value={energy}
          onChange={setEnergy}
          options={[
            { value: 1, label: `${n(1)} ${t.energyLowWord}` },
            { value: 2, label: n(2) },
            { value: 3, label: n(3) },
            { value: 4, label: `${n(4)} ${t.energyHighWord}` },
          ]}
        />
        <ChoiceRow
          legend={t.symptomLevel}
          value={symptomLevel}
          onChange={setSymptomLevel}
          options={[
            { value: "none", label: t.symptomNone },
            { value: "mild", label: t.symptomMild },
            { value: "moderate", label: t.symptomModerate },
            { value: "severe", label: t.symptomSevere },
          ]}
        />
      </section>

      <section className="rounded-2xl border border-destructive/30 bg-card px-4 py-4">
        <h2 className="flex items-center gap-2 font-medium text-destructive">
          <TriangleAlert className="size-5" aria-hidden />
          {t.urgentGroup}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.urgentGroupHint}</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {URGENT_SYMPTOMS.map((s) => (
            <SymptomChip
              key={s.value}
              urgent
              label={t[s.key]}
              active={symptoms.includes(s.value)}
              onToggle={() => toggleSymptom(s.value)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card px-4 py-4">
        <h2 className="font-medium">{t.otherSymptoms}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {OTHER_SYMPTOMS.map((s) => (
            <SymptomChip
              key={s.value}
              label={t[s.key]}
              active={symptoms.includes(s.value)}
              onToggle={() => toggleSymptom(s.value)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card px-4 py-4">
        <label htmlFor="checkin-note" className="font-medium">
          {t.note}
        </label>
        <Textarea
          id="checkin-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.notePlaceholder}
          className="mt-2 min-h-24 text-base"
        />
      </section>

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving || nothingEntered}
          className="h-12 flex-1 text-base"
        >
          {saving ? dict.common.loading : t.save}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard")}
          className="h-12"
        >
          {t.skip}
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="size-5" aria-hidden />
              {dict.redflag.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground">
              {urgentMessage(locale)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <a
              href="tel:999"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-destructive px-4 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Phone className="size-5" aria-hidden />
              {t.call999}
            </a>
            <Button
              variant="outline"
              className="h-12"
              onClick={() => {
                setOpen(false);
                router.push("/records?tab=timeline");
              }}
            >
              {t.iUnderstand}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
