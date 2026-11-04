"use client";

import { useEffect, useState } from "react";

export type CheckinEntry = {
  date: string;
  sleepHours?: number;
  waterGlasses?: number;
  activityMinutes?: number;
  energy?: 1 | 2 | 3 | 4;
  symptomLevel?: "none" | "mild" | "moderate" | "severe";
  symptoms?: string[];
  note?: string;
};

/** The phone's own date, so a late-night check-in lands on the right day. */
export function localISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today's and yesterday's check-ins. `loading` stays true until both are known. */
export function useTodayCheckin() {
  const [state, setState] = useState<{ loading: boolean; today: CheckinEntry | null; yesterday: CheckinEntry | null }>({
    loading: true,
    today: null,
    yesterday: null,
  });

  useEffect(() => {
    let cancelled = false;
    const today = localISODate();
    const yesterday = localISODate(new Date(Date.now() - 86_400_000));
    fetch(`/api/wellness?from=${yesterday}&to=${today}`)
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .catch(() => ({ entries: [] }))
      .then((data: { entries?: CheckinEntry[] }) => {
        if (cancelled) return;
        const entries = data.entries ?? [];
        setState({
          loading: false,
          today: entries.find((e) => e.date === today) ?? null,
          yesterday: entries.find((e) => e.date === yesterday) ?? null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
