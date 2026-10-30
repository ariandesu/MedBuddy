"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis } from "recharts";
import type { Dictionary } from "@/lib/i18n";

export function TrendChart({
  entries,
  dict,
  missing,
}: {
  entries: { date: string; sleepHours?: number; waterGlasses?: number; activityMinutes?: number }[];
  dict: Dictionary;
  missing: number;
}) {
  const data = entries.map((e) => ({
    date: e.date,
    sleep: e.sleepHours,
    water: e.waterGlasses,
    activity: e.activityMinutes,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wellness trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <LineChart width={340} height={260} data={data}>
            <XAxis dataKey="date" />
            <YAxis />
            <Line type="natural" dot={false} stroke="hsl(210, 90%, 50%)" dataKey="sleep" />
            <Line type="natural" dot={false} stroke="hsl(150, 60%, 45%)" dataKey="water" />
            <Line type="natural" dot={false} stroke="hsl(20, 90%, 50%)" dataKey="activity" />
          </LineChart>
        </div>
        {missing > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {dict.chart.missingDays.replace("{{count}}", String(missing))}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
