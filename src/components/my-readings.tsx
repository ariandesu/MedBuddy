"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Droplets, HeartPulse, Phone, Plus, Scale, Thermometer, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLocale } from "@/components/locale-provider";
import { formatDate, normalizeDigits, toLocaleDigits } from "@/lib/digits";
import { formatReading, READING_KINDS, readingInputSchema, type ReadingInput, type ReadingKind } from "@/lib/schemas";
import { localISODate } from "@/lib/use-today-checkin";

type Reading = { id: string; date: string; kind: ReadingKind; value: number; value2?: number };

const ICONS = {
  blood_pressure: Activity,
  pulse: HeartPulse,
  oxygen: Droplets,
  temperature: Thermometer,
  weight: Scale,
} as const;

const fieldClass = "h-12 min-w-0 rounded-[1.125rem] border-input bg-popover text-base tabular-nums";

const toNumber = (text: string) => Number(normalizeDigits(text.trim()));

/** Readings the person typed in from their own device. Shown as theirs, and never judged. */
export function MyReadings({ latest }: { latest: Reading[] }) {
  const { dict, locale } = useLocale();
  const t = dict.dashboard.readings;
  const router = useRouter();
  const digits = (s: string) => toLocaleDigits(s, locale);

  const [open, setOpen] = useState(false);
  const [text, setText] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState<ReadingKind[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const setField = (name: string, value: string) => setText((prev) => ({ ...prev, [name]: value }));

  const save = async () => {
    const readings: ReadingInput[] = [];
    const bad: ReadingKind[] = [];
    for (const kind of READING_KINDS) {
      const first = text[kind]?.trim();
      const second = kind === "blood_pressure" ? text.bloodPressureLower?.trim() : undefined;
      if (!first && !second) continue;
      const parsed = readingInputSchema.safeParse({
        kind,
        value: first ? toNumber(first) : NaN,
        ...(kind === "blood_pressure" && { value2: second ? toNumber(second) : NaN }),
      });
      if (parsed.success) readings.push(parsed.data);
      else bad.push(kind);
    }
    setInvalid(bad);
    if (bad.length > 0) return;
    if (readings.length === 0) {
      toast.error(t.nothingEntered);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: localISODate(), readings }),
      });
      if (!res.ok) throw new Error();
      toast.success(t.saved);
      setText({});
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(dict.common.error);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/readings/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConfirmingId(null);
      toast.success(t.removed);
      router.refresh();
    } catch {
      toast.error(dict.common.error);
    }
  };

  return (
    <section aria-labelledby="readings-h" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <h2 id="readings-h" className="font-heading text-lg font-semibold">{t.title}</h2>

      {latest.length === 0 ? (
        <p className="text-muted-foreground">{t.empty}</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-4">
            {latest.map((r) => {
              const Icon = ICONS[r.kind];
              return (
                <div key={r.kind} className="flex flex-col gap-0.5">
                  <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {t.kinds[r.kind]}
                  </dt>
                  <dd className="font-heading text-xl font-semibold tabular-nums">
                    {formatReading(r, digits)}{" "}
                    <span className="block text-sm font-normal text-muted-foreground">
                      {t.units[r.kind]}, {formatDate(r.date, locale, { withYear: false })}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="text-sm text-muted-foreground">{t.note}</p>
        </>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="secondary" className="h-12 w-full gap-2 text-base font-semibold" />}>
          <Plus className="size-5!" aria-hidden />
          {t.add}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="max-h-[92dvh] gap-3 overflow-y-auto rounded-t-[2rem] bg-background px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] text-base"
        >
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="font-heading text-xl font-semibold">{t.sheetTitle}</SheetTitle>
            <SheetClose render={<Button variant="secondary" size="icon" className="size-12" aria-label={dict.common.close} />}>
              <X className="size-5!" aria-hidden />
            </SheetClose>
          </div>
          <p className="text-muted-foreground">{t.sheetBody}</p>

          <a href="tel:999" className="flex min-h-12 items-center gap-2 font-medium underline underline-offset-4">
            <Phone className="size-5 shrink-0" aria-hidden />
            {t.urgent}
          </a>

          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            {READING_KINDS.map((kind) => (
              <div key={kind} className="flex flex-col gap-1">
                {kind === "blood_pressure" ? (
                  <fieldset className="flex flex-col gap-1">
                    <legend className="font-medium">{t.kinds[kind]} ({t.units[kind]})</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                        {t.upper}
                        <Input inputMode="numeric" value={text[kind] ?? ""} onChange={(e) => setField(kind, e.target.value)} aria-invalid={invalid.includes(kind)} className={fieldClass} />
                      </label>
                      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                        {t.lower}
                        <Input inputMode="numeric" value={text.bloodPressureLower ?? ""} onChange={(e) => setField("bloodPressureLower", e.target.value)} aria-invalid={invalid.includes(kind)} className={fieldClass} />
                      </label>
                    </div>
                  </fieldset>
                ) : (
                  <label className="flex flex-col gap-1 font-medium">
                    {t.kinds[kind]} ({t.units[kind]})
                    <Input
                      inputMode={kind === "temperature" || kind === "weight" ? "decimal" : "numeric"}
                      value={text[kind] ?? ""}
                      onChange={(e) => setField(kind, e.target.value)}
                      aria-invalid={invalid.includes(kind)}
                      className={fieldClass}
                    />
                  </label>
                )}
                {invalid.includes(kind) && <p role="alert" className="text-sm font-medium text-destructive">{t.checkNumber}</p>}
              </div>
            ))}
            <Button type="submit" disabled={saving} className="h-14 w-full text-lg font-semibold">{t.save}</Button>
          </form>

          {latest.length > 0 && (
            <div className="flex flex-col gap-1">
              <h3 className="font-heading text-base font-semibold">{t.removeTitle}</h3>
              <ul className="divide-y rounded-2xl border bg-card px-3">
                {latest.map((r) => (
                  <li key={r.id} className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-1">
                    <span className="min-w-0">
                      {t.kinds[r.kind]}: <span className="font-semibold tabular-nums">{formatReading(r, digits)}</span>
                    </span>
                    {confirmingId === r.id ? (
                      <span className="flex gap-2">
                        <Button variant="secondary" className="h-12" onClick={() => setConfirmingId(null)}>{t.keep}</Button>
                        <Button variant="destructive" className="h-12" onClick={() => void remove(r.id)}>{t.confirmRemove}</Button>
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-12"
                        aria-label={t.removeLabel.replace("{{name}}", t.kinds[r.kind])}
                        onClick={() => setConfirmingId(r.id)}
                      >
                        <Trash2 className="size-5!" aria-hidden />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
