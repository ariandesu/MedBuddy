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
import {
  Moon,
  GlassWater,
  Activity,
  Battery,
  Thermometer,
  Edit,
  BellRing,
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useDictionary } from "@/lib/use-dictionary";
import { isRedFlag, urgentMessage } from "@/lib/safety/redflags";

type SymptomLevel = "none" | "mild" | "moderate" | "severe";

const FIELD_ICONS: Record<string, { Icon: typeof Moon; color: string }> = {
  sleep: { Icon: Moon, color: "bg-indigo-50 text-indigo-600" },
  water: { Icon: GlassWater, color: "bg-blue-50 text-blue-600" },
  activity: { Icon: Activity, color: "bg-green-50 text-green-600" },
  energy: { Icon: Battery, color: "bg-orange-50 text-orange-600" },
  symptomLevel: { Icon: Thermometer, color: "bg-red-50 text-red-600" },
  symptoms: { Icon: AlertTriangle, color: "bg-purple-50 text-purple-600" },
  note: { Icon: Edit, color: "bg-gray-50 text-gray-600" },
};

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
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <ClipboardCheck className="size-8 text-primary" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold">{dict.checkin.title}</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          {dict.checkin.optionalNote}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{dict.checkin.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded flex items-center justify-center ${FIELD_ICONS.sleep.color}`}>
                <Moon className="size-4" aria-hidden />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">{dict.checkin.sleep}</label>
                <Checkbox
                  checked={sleepSkip}
                  onCheckedChange={setSleepSkip}
                  aria-label={dict.checkin.skipSlider}
                />
              </div>
            </div>
            {!sleepSkip && (
              <>
                <Slider
                  value={sleepHours ?? 7}
                  onValueChange={(value) => {
                    setSleepSkip(false);
                    setSleepHours(typeof value === "number" ? value : null);
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
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded flex items-center justify-center ${FIELD_ICONS.water.color}`}>
                <GlassWater className="size-4" aria-hidden />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">{dict.checkin.water}</label>
                <Checkbox
                  checked={waterSkip}
                  onCheckedChange={setWaterSkip}
                  aria-label={dict.checkin.skipSlider}
                />
              </div>
            </div>
            {!waterSkip && (
              <>
                <Slider
                  value={waterGlasses ?? 6}
                  onValueChange={(value) => {
                    setWaterSkip(false);
                    setWaterGlasses(typeof value === "number" ? value : null);
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
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded flex items-center justify-center ${FIELD_ICONS.activity.color}`}>
                <Activity className="size-4" aria-hidden />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">{dict.checkin.activity}</label>
                <Checkbox
                  checked={activitySkip}
                  onCheckedChange={setActivitySkip}
                  aria-label={dict.checkin.skipSlider}
                />
              </div>
            </div>
            {!activitySkip && (
              <>
                <Slider
                  value={activityMinutes ?? 30}
                  onValueChange={(value) => {
                    setActivitySkip(false);
                    setActivityMinutes(typeof value === "number" ? value : null);
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
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded flex items-center justify-center ${FIELD_ICONS.energy.color}`}>
                <Battery className="size-4" aria-hidden />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">{dict.checkin.energy}</label>
                <RadioGroup
                  value={energy ?? ""}
                  onValueChange={(value) => setEnergy(value as 1 | 2 | 3 | 4)}
                >
                  {[1, 2, 3, 4].map((v) => {
                    const key = `energy${v === 1 ? "Low" : v === 4 ? "High" : v}`;
                    const label = (dict.checkin as Record<string, string>)[key];
                    return (
                      <div key={v} className="flex items-center gap-2">
                        <RadioGroupItem value={String(v)} id={`energy-${v}`} />
                        <label htmlFor={`energy-${v}`} className="text-sm">
                          {label}
                        </label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded flex items-center justify-center ${FIELD_ICONS.symptomLevel.color}`}>
                <Thermometer className="size-4" aria-hidden />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">{dict.checkin.symptomLevel}</label>
                <RadioGroup
                  value={symptomLevel ?? undefined}
                  onValueChange={(value) => setSymptomLevel(value as SymptomLevel)}
                >
                  {["none", "mild", "moderate", "severe"].map((v) => {
                    const key = `symptom${v.charAt(0).toUpperCase() + v.slice(1)}`;
                    const label = (dict.checkin as Record<string, string>)[key];
                    return (
                      <div key={v} className="flex items-center gap-2">
                        <RadioGroupItem value={v} id={`sev-${v}`} />
                        <label htmlFor={`sev-${v}`} className="text-sm">
                          {label}
                        </label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded flex items-center justify-center ${FIELD_ICONS.symptoms.color}`}>
                <AlertTriangle className="size-4" aria-hidden />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">{dict.checkin.symptoms}</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={symptoms.includes("chest pain")}
                      onCheckedChange={(value) => {
                        setSymptoms(value
                          ? [...symptoms, "chest pain"]
                          : symptoms.filter((x) => x !== "chest pain")
                        );
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="size-3 text-muted-foreground" aria-hidden />
                      <label className="text-sm">{dict.checkin.symptomChestPain}</label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={symptoms.includes("difficulty breathing")}
                      onCheckedChange={(value) => {
                        setSymptoms(value
                          ? [...symptoms, "difficulty breathing"]
                          : symptoms.filter((x) => x !== "difficulty breathing")
                        );
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="size-3 text-muted-foreground" aria-hidden />
                      <label className="text-sm">{dict.checkin.symptomDifficultyBreathing}</label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={symptoms.includes("fainting")}
                      onCheckedChange={(value) => {
                        setSymptoms(value
                          ? [...symptoms, "fainting"]
                          : symptoms.filter((x) => x !== "fainting")
                        );
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="size-3 text-muted-foreground" aria-hidden />
                      <label className="text-sm">{dict.checkin.symptomFainting}</label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={symptoms.includes("severe bleeding")}
                      onCheckedChange={(value) => {
                        setSymptoms(value
                          ? [...symptoms, "severe bleeding"]
                          : symptoms.filter((x) => x !== "severe bleeding")
                        );
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="size-3 text-muted-foreground" aria-hidden />
                      <label className="text-sm">{dict.checkin.symptomSevereBleeding}</label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={symptoms.includes("confusion")}
                      onCheckedChange={(value) => {
                        setSymptoms(value
                          ? [...symptoms, "confusion"]
                          : symptoms.filter((x) => x !== "confusion")
                        );
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="size-3 text-muted-foreground" aria-hidden />
                      <label className="text-sm">{dict.checkin.symptomConfusion}</label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={symptoms.includes("stroke signs")}
                      onCheckedChange={(value) => {
                        setSymptoms(value
                          ? [...symptoms, "stroke signs"]
                          : symptoms.filter((x) => x !== "stroke signs")
                        );
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="size-3 text-muted-foreground" aria-hidden />
                      <label className="text-sm">{dict.checkin.symptomStrokeSigns}</label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={symptoms.includes("headache")}
                      onCheckedChange={(value) => {
                        setSymptoms(value
                          ? [...symptoms, "headache"]
                          : symptoms.filter((x) => x !== "headache")
                        );
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <Thermometer className="size-3 text-muted-foreground" aria-hidden />
                      <label className="text-sm">{dict.checkin.symptomHeadache}</label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={symptoms.includes("fever")}
                      onCheckedChange={(value) => {
                        setSymptoms(value
                          ? [...symptoms, "fever"]
                          : symptoms.filter((x) => x !== "fever")
                        );
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <Thermometer className="size-3 text-muted-foreground" aria-hidden />
                      <label className="text-sm">{dict.checkin.symptomFever}</label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={symptoms.includes("cough")}
                      onCheckedChange={(value) => {
                        setSymptoms(value
                          ? [...symptoms, "cough"]
                          : symptoms.filter((x) => x !== "cough")
                        );
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="size-3 text-muted-foreground" aria-hidden />
                      <label className="text-sm">{dict.checkin.symptomCough}</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded flex items-center justify-center ${FIELD_ICONS.note.color}`}>
                <Edit className="size-4" aria-hidden />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">{dict.checkin.note}</label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={dict.checkin.notePlaceholder}
                  className="h-24"
                />
              </div>
            </div>
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
        <div className="rounded-lg bg-green-50 p-4 text-green-800 text-sm flex items-center gap-2">
          <CheckCircle className="size-4" aria-hidden />
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
          </AlertDialogHeader>
          <AlertDialogDescription>{urgentMessage(locale)}</AlertDialogDescription>
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
