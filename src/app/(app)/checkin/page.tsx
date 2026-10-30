"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Dictionary } from "@/lib/i18n";

type SymptomLevel = "none" | "mild" | "moderate" | "severe";

const RED_FLAG_SYMPTOMS = new Set([
  "chest pain",
  "chest_pain",
  "difficulty breathing",
  "difficulty_breathing",
  "shortness of breath",
  "fainting",
  "fainted",
  "severe bleeding",
  "severe_bleeding",
  "bleeding",
  "confusion",
  "confused",
  "stroke",
  "stroke signs",
]);

function isRedFlag(entry: {
  symptomLevel?: SymptomLevel | null;
  symptoms?: string[];
}): boolean {
  if (entry.symptomLevel === "severe") return true;
  return (entry.symptoms ?? []).some((s) => RED_FLAG_SYMPTOMS.has(s.toLowerCase().trim()));
}

const URGENT_MESSAGE =
  "This may need urgent care. In Bangladesh call 999 or go to the nearest hospital.";

export default function CheckinPage({ dict }: { dict: Dictionary }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [waterGlasses, setWaterGlasses] = useState<number | null>(null);
  const [activityMinutes, setActivityMinutes] = useState<number | null>(null);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4>(3);
  const [symptomLevel, setSymptomLevel] = useState<SymptomLevel>("none");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const redFlag = isRedFlag({ symptomLevel, symptoms });

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
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
      if (!res.ok) throw new Error(dict.common.error);
      await res.json();
      setSaved(true);
      if (redFlag) setOpen(true);
      else router.push("/timeline");
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
        Every field is optional. Takes under a minute.
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
            <label className="text-sm font-medium">{dict.checkin.sleep}</label>
            <Slider
              value={sleepHours ?? 7}
              onValueChange={(value) => {
                setSleepHours(typeof value === "number" ? value : null);
              }}
              min={0}
              max={24}
              step={0.5}
            />
            <p className="text-xs text-muted-foreground">
              {sleepHours == null ? "not set" : `${sleepHours} hrs`}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.checkin.water}</label>
            <Slider
              value={waterGlasses ?? 6}
              onValueChange={(value) => {
                setWaterGlasses(typeof value === "number" ? value : null);
              }}
              min={0}
              max={30}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              {waterGlasses == null ? "not set" : `${waterGlasses} glasses`}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.checkin.activity}</label>
            <Slider
              value={activityMinutes ?? 30}
              onValueChange={(value) => {
                setActivityMinutes(typeof value === "number" ? value : null);
              }}
              min={0}
              max={1440}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              {activityMinutes == null ? "not set" : `${activityMinutes} min`}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.checkin.energy}</label>
            <RadioGroup
              value={energy}
              onValueChange={(value) => setEnergy(value as 1 | 2 | 3 | 4)}
            >
              {[1, 2, 3, 4].map((v) => (
                <div key={v} className="flex items-center gap-3">
                  <RadioGroupItem value={v} id={`energy-${v}`} />
                  <label htmlFor={`energy-${v}`} className="text-sm">
                    {v}{v === 1 ? " (low)" : v === 4 ? " (high)" : ""}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{dict.checkin.symptomLevel}</label>
            <RadioGroup
              value={symptomLevel}
              onValueChange={(value) => setSymptomLevel(value as SymptomLevel)}
            >
              {[
                ["none", "None"],
                ["mild", "Mild"],
                ["moderate", "Moderate"],
                ["severe", "Severe"],
              ].map(([v, label]) => (
                <div key={v} className="flex items-center gap-3">
                  <RadioGroupItem value={v} id={`sev-${v}`} />
                  <label htmlFor={`sev-${v}`} className="text-sm">
                    {label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Symptoms</label>
            <Select
              value={symptoms.join(",")}
              onValueChange={(value) => {
                setSymptoms(value ? value.split(",") : []);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select symptoms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chest pain">Chest pain</SelectItem>
                <SelectItem value="difficulty breathing">
                  Difficulty breathing
                </SelectItem>
                <SelectItem value="fainting">Fainting</SelectItem>
                <SelectItem value="severe bleeding">Severe bleeding</SelectItem>
                <SelectItem value="confusion">Confusion</SelectItem>
                <SelectItem value="stroke signs">Stroke signs</SelectItem>
                <SelectItem value="headache">Headache</SelectItem>
                <SelectItem value="fever">Fever</SelectItem>
                <SelectItem value="cough">Cough</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Note</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note…"
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
          {dict.common.save} successful.
        </div>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <BellRing className="mr-2 h-5 w-5" aria-hidden />
              {dict.redflag.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{URGENT_MESSAGE}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => router.push("/timeline")}>
              I understand
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
