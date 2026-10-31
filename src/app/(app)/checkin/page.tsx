"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BellRing } from "lucide-react";
import { useDictionary } from "@/lib/use-dictionary";
import { isRedFlag, urgentMessage } from "@/lib/safety/redflags";

type SymptomLevel = "none" | "mild" | "moderate" | "severe";

const SYMPTOMS: Array<{ value: string; labelKey: string }> = [
  { value: "chest pain", labelKey: "checkin.symptomChestPain" },
  { value: "difficulty breathing", labelKey: "checkin.symptomDifficultyBreathing" },
  { value: "fainting", labelKey: "checkin.symptomFainting" },
  { value: "severe bleeding", labelKey: "checkin.symptomSevereBleeding" },
  { value: "confusion", labelKey: "checkin.symptomConfusion" },
  { value: "stroke signs", labelKey: "checkin.symptomStrokeSigns" },
  { value: "headache", labelKey: "checkin.symptomHeadache" },
  { value: "fever", labelKey: "checkin.symptomFever" },
  { value: "cough", labelKey: "checkin.symptomCough" },
];

function getLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getLocaleFromCookie(): "bn" | "en" {
  const m = document.cookie.match(/(?:^|; )medisathi-locale=([^;]+)/);
  return m?.[1] === "bn" ? "bn" : "en";
}

export default function CheckinPage() {
  const dict = useDictionary();
  const router = useRouter();
  const locale = getLocaleFromCookie();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [sleepSkip, setSleepSkip] = useState(true);
  const [waterGlasses, setWaterGlasses] = useState<number | null>(null);
  const [waterSkip, setWaterSkip] = useState(true);
  const [activityMinutes, setActivityMinutes] = useState<number | null>(null);
  const [activitySkip, setActivitySkip] = useState(true);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | null>(null);
  const [symptomLevel, setSymptomLevel] = useState<SymptomLevel | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const redFlag = isRedFlag({ symptomLevel, symptoms });

  async function handleSave() {
    // Safety: show urgent dialog before or regardless of network result.
    if (redFlag) {
      setOpen(true);
    }

    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (!sleepSkip && sleepHours != null) body.sleepHours = sleepHours;
      if (!waterSkip && waterGlasses != null) body.waterGlasses = waterGlasses;
      if (!activitySkip && activityMinutes != null)
        body.activityMinutes = activityMinutes;
      if (energy != null) body.energy = energy;
      if (symptomLevel != null) body.symptomLevel = symptomLevel;
      if (symptoms.length) body.symptoms = symptoms;
      if (note.trim()) body.note = note.trim();

      const res = await fetch("/api/wellness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(dict.common.error);
      await res.json();
      setSaved(true);
      if (!redFlag) router.push("/timeline");
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    router.push("/timeline");
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">{dict.checkin.title}</h1>
      <p className="text-sm text-muted-foreground">
        {dict.checkin.optionalNote}
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{dict.checkin.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{dict.checkin.sleep}</label>
              <Checkbox
                checked={sleepSkip}
                onCheckedChange={setSleepSkip}
                aria-label={dict.checkin.skipSlider}
              />
            </div>
            {!sleepSkip && (
              <>
                <Slider
                  value={sleepHours ?? 7}
                  onValueChange={(value) => {
                    setSleepSkip(false);
                    setSleepHours(
                      typeof value === "number" ? value : null
                    );
                  }}
                  min={0}
                  max={24}
                  step={0.5}
                  disabled={sleepSkip}
                />
                <p className="text-xs text-muted-foreground">
                  {sleepHours == null
                    ? dict.checkin.notSet
                    : `${sleepHours} ${dict.checkin.hrs}`}
                </p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{dict.checkin.water}</label>
              <Checkbox
                checked={waterSkip}
                onCheckedChange={setWaterSkip}
                aria-label={dict.checkin.skipSlider}
              />
            </div>
            {!waterSkip && (
              <>
                <Slider
                  value={waterGlasses ?? 6}
                  onValueChange={(value) => {
                    setWaterSkip(false);
                    setWaterGlasses(
                      typeof value === "number" ? value : null
                    );
                  }}
                  min={0}
                  max={30}
                  step={1}
                  disabled={waterSkip}
                />
                <p className="text-xs text-muted-foreground">
                  {waterGlasses == null
                    ? dict.checkin.notSet
                    : `${waterGlasses} ${dict.checkin.glasses}`}
                </p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{dict.checkin.activity}</label>
              <Checkbox
                checked={activitySkip}
                onCheckedChange={setActivitySkip}
                aria-label={dict.checkin.skipSlider}
              />
            </div>
            {!activitySkip && (
              <>
                <Slider
                  value={activityMinutes ?? 30}
                  onValueChange={(value) => {
                    setActivitySkip(false);
                    setActivityMinutes(
                      typeof value === "number" ? value : null
                    );
                  }}
                  min={0}
                  max={1440}
                  step={5}
                  disabled={activitySkip}
                />
                <p className="text-xs text-muted-foreground">
                  {activityMinutes == null
                    ? dict.checkin.notSet
                    : `${activityMinutes} ${dict.checkin.min}`}
                </p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.checkin.energy}</label>
            <RadioGroup
              value={energy ?? ""}
              onValueChange={(value) =>
                setEnergy(value as 1 | 2 | 3 | 4)
              }
            >
              {[
                [1, "energyLow"],
                [2, "energy2"],
                [3, "energy3"],
                [4, "energyHigh"],
              ].map(([v, key]) => (
                <div key={v} className="flex items-center gap-3">
                  <RadioGroupItem value={String(v)} id={`energy-${v}`} />
                  <label htmlFor={`energy-${v}`} className="text-sm">
                    {dict.checkin[key as keyof typeof dict.checkin]}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.checkin.symptomLevel}</label>
            <RadioGroup
              value={symptomLevel ?? undefined}
              onValueChange={(value) =>
                setSymptomLevel(value as SymptomLevel)
              }
            >
              {[
                ["none", "symptomNone"],
                ["mild", "symptomMild"],
                ["moderate", "symptomModerate"],
                ["severe", "symptomSevere"],
              ].map(([v, key]) => (
                <div key={v} className="flex items-center gap-3">
                  <RadioGroupItem value={v} id={`sev-${v}`} />
                  <label htmlFor={`sev-${v}`} className="text-sm">
                    {dict.checkin[key as keyof typeof dict.checkin]}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.checkin.symptoms}</label>
            <div className="grid grid-cols-2 gap-2">
              {SYMPTOMS.map((s) => {
                const checked = symptoms.includes(s.value);
                return (
                  <div key={s.value} className="flex items-center gap-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        setSymptoms(value
                          ? [...symptoms, s.value]
                          : symptoms.filter((x) => x !== s.value)
                        );
                      }}
                      aria-label={dict.checkin[s.labelKey.replace("checkin.", "") as keyof typeof dict.checkin]}
                    />
                    <label className="text-sm" htmlFor={`sym-${s.value}`}>
                      {dict.checkin[s.labelKey.replace("checkin.", "") as keyof typeof dict.checkin]}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.checkin.note}</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={dict.checkin.notePlaceholder}
              className="h-24"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-h-[44px] flex-1"
        >
          {saving ? dict.common.loading : dict.checkin.save}
        </Button>
        <Button variant="outline" onClick={handleSkip} className="min-h-[44px]">
          {dict.checkin.skip}
        </Button>
      </div>

      {saved && (
        <div className="rounded-lg bg-green-50 p-4 text-green-800 text-sm">
          {dict.checkin.saved}
        </div>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <BellRing className="mr-2 h-5 w-5" aria-hidden />
              {dict.redflag.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{urgentMessage(locale)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => router.push("/timeline")}>
              {dict.checkin.iUnderstand}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
