"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Dictionary } from "@/lib/i18n";

export function GenerateSummaryButton({ dict, label, primary = false }: {
  dict: Dictionary;
  label: string;
  primary?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [noRecords, setNoRecords] = useState(false);

  async function handleGenerate() {
    setSaving(true);
    setNoRecords(false);
    try {
      const res = await fetch("/api/summaries/generate", { method: "POST" });
      if (res.status === 400) {
        setNoRecords(true);
        return;
      }
      if (!res.ok) throw new Error(dict.common.error);
      await res.json();
      toast.success(dict.summary.toastGenerated);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleGenerate}
        disabled={saving}
        variant={primary ? "default" : "secondary"}
        className="h-14 w-full text-lg font-semibold"
      >
        {saving ? dict.common.loading : label}
      </Button>
      {noRecords && (
        <p className="text-sm text-muted-foreground">
          {dict.summary.noRecords}{" "}
          <Link href="/records" className="underline underline-offset-4">
            {dict.summary.uploadDocument}
          </Link>
        </p>
      )}
    </div>
  );
}
